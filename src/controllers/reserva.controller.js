const { PrismaClient } = require('@prisma/client');
const {
  CATALOGO_FILTRO_BASE,
  buildTherapistWhere,
  serializeTherapistPublico
} = require('../utils/therapist-publico');
const {
  buildSlotDate,
  carregarOcupados,
  encontrarBlocoDoHorario
} = require('../utils/agenda');
const {
  liberarHorariosExpirados,
  minutosDePagamento,
  minutosDeReserva
} = require('../utils/expiracao');
const { serializeAppointment } = require('../utils/appointment-status');
const {
  formatarDataHora,
  notificarAgendamento
} = require('../services/notificacao.service');

const prisma = new PrismaClient();

const MODALIDADES = ['ONLINE', 'PRESENCIAL'];

function resolverHorario(body) {
  if (body?.horario_atendimento) {
    const parsed = new Date(body.horario_atendimento);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  if (body?.data && body?.inicio) {
    return buildSlotDate(String(body.data), String(body.inicio));
  }

  return null;
}

function serializeReserva(reserva) {
  if (!reserva) return reserva;

  const restanteMs = reserva.expiresAt.getTime() - Date.now();

  return {
    id: reserva.id,
    status: reserva.status,
    data: reserva.data_atendimento,
    horario: reserva.horario_atendimento.toISOString(),
    duracaoMinutos: reserva.duracaoMinutos,
    modalidade: reserva.modalidade,
    valor: reserva.valor,
    expiresAt: reserva.expiresAt.toISOString(),
    segundosRestantes: Math.max(0, Math.floor(restanteMs / 1000)),
    patientId: reserva.patientId,
    appointmentId: reserva.appointmentId,
    psicologo: reserva.therapist
      ? serializeTherapistPublico(reserva.therapist)
      : undefined
  };
}

module.exports = {
  /**
   * Segura o horario antes do cadastro (card P0 - Novo Fluxo de Agendamento).
   * Rota publica: o paciente ainda nao tem conta nesse ponto da jornada.
   */
  async criar(req, res) {
    try {
      await liberarHorariosExpirados(prisma);

      const identificador =
        req.body?.therapistId ?? req.body?.psicologo ?? req.body?.slug;

      if (!identificador) {
        return res.status(400).json({
          message: 'Informe therapistId (id ou slug do psicologo).'
        });
      }

      const therapist = await prisma.therapist.findFirst({
        where: {
          ...buildTherapistWhere(identificador),
          ...CATALOGO_FILTRO_BASE
        }
      });

      if (!therapist) {
        return res.status(404).json({ message: 'Psicologo nao encontrado.' });
      }

      const horario = resolverHorario(req.body);
      if (!horario) {
        return res.status(400).json({
          message: 'Informe data (YYYY-MM-DD) e inicio (HH:MM), ou horario_atendimento.'
        });
      }

      const modalidade = String(
        req.body?.modalidade || therapist.modalidades?.[0] || 'ONLINE'
      ).toUpperCase();

      if (!MODALIDADES.includes(modalidade)) {
        return res.status(400).json({
          message: `Modalidade invalida. Use uma de: ${MODALIDADES.join(', ')}.`
        });
      }

      const dataAtendimento = horario.toISOString().slice(0, 10);
      const inicioDia = new Date(`${dataAtendimento}T00:00:00.000Z`);
      const fimDia = new Date(inicioDia);
      fimDia.setUTCDate(fimDia.getUTCDate() + 1);

      const availabilities = await prisma.therapistAvailability.findMany({
        where: {
          therapistId: therapist.id,
          isAvailable: true,
          date: { gte: inicioDia, lt: fimDia }
        }
      });

      const bloco = encontrarBlocoDoHorario(
        availabilities,
        horario,
        therapist.duracaoConsulta
      );

      if (!bloco) {
        return res.status(409).json({
          message: 'O psicologo nao atende nesse horario.'
        });
      }

      if (horario.getTime() <= Date.now()) {
        return res.status(409).json({
          message: 'Nao e possivel reservar um horario que ja passou.'
        });
      }

      const reserva = await prisma.$transaction(async (tx) => {
        const ocupados = await carregarOcupados(tx, {
          therapistId: therapist.id,
          inicio: horario,
          fim: new Date(horario.getTime() + 1)
        });

        if (ocupados.has(horario.toISOString())) {
          const conflito = new Error('HORARIO_OCUPADO');
          conflito.code = 'HORARIO_OCUPADO';
          throw conflito;
        }

        return tx.reserva.create({
          data: {
            therapistId: therapist.id,
            availabilityId: bloco.id,
            data_atendimento: dataAtendimento,
            horario_atendimento: horario,
            duracaoMinutos: therapist.duracaoConsulta,
            modalidade,
            valor: therapist.valorConsulta,
            expiresAt: new Date(Date.now() + minutosDeReserva() * 60000)
          },
          include: { therapist: true }
        });
      });

      return res.status(201).json({
        message: `Horario reservado por ${minutosDeReserva()} minutos.`,
        reserva: serializeReserva(reserva)
      });
    } catch (error) {
      if (error.code === 'HORARIO_OCUPADO') {
        return res.status(409).json({
          message: 'Esse horario acabou de ser reservado por outra pessoa.'
        });
      }

      console.error(error);
      return res.status(500).json({ message: 'Erro ao reservar horario.' });
    }
  },

  /**
   * Consulta a reserva para o front saber quanto tempo ainda resta.
   */
  async obter(req, res) {
    try {
      const reserva = await prisma.reserva.findUnique({
        where: { id: String(req.params.id) },
        include: { therapist: true }
      });

      if (!reserva) {
        return res.status(404).json({ message: 'Reserva nao encontrada.' });
      }

      if (reserva.status === 'ATIVA' && reserva.expiresAt < new Date()) {
        const expirada = await prisma.reserva.update({
          where: { id: reserva.id },
          data: { status: 'EXPIRADA' },
          include: { therapist: true }
        });

        return res.json(serializeReserva(expirada));
      }

      return res.json(serializeReserva(reserva));
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Erro ao consultar reserva.' });
    }
  },

  /**
   * Cancela a reserva quando o paciente volta atras no fluxo.
   */
  async cancelar(req, res) {
    try {
      const reserva = await prisma.reserva.findUnique({
        where: { id: String(req.params.id) }
      });

      if (!reserva) {
        return res.status(404).json({ message: 'Reserva nao encontrada.' });
      }

      if (reserva.status !== 'ATIVA') {
        return res.status(409).json({
          message: `Reserva nao esta ativa (status atual: ${reserva.status}).`
        });
      }

      const cancelada = await prisma.reserva.update({
        where: { id: reserva.id },
        data: { status: 'CANCELADA' },
        include: { therapist: true }
      });

      return res.json(serializeReserva(cancelada));
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Erro ao cancelar reserva.' });
    }
  },

  /**
   * Transforma a reserva em agendamento aguardando pagamento.
   * Exige paciente autenticado (cadastro ja concluido).
   */
  async confirmar(req, res) {
    try {
      const patientId = Number(req.user?.id);
      if (!Number.isInteger(patientId)) {
        return res.status(401).json({ message: 'Paciente nao identificado.' });
      }

      const reserva = await prisma.reserva.findUnique({
        where: { id: String(req.params.id) },
        include: { therapist: true }
      });

      if (!reserva) {
        return res.status(404).json({ message: 'Reserva nao encontrada.' });
      }

      if (reserva.status === 'CONVERTIDA' && reserva.appointmentId) {
        const existente = await prisma.appointment.findUnique({
          where: { id: reserva.appointmentId }
        });

        return res.json({
          message: 'Reserva ja convertida em agendamento.',
          agendamento: serializeAppointment(existente)
        });
      }

      if (reserva.status !== 'ATIVA') {
        return res.status(409).json({
          message: `Reserva nao esta ativa (status atual: ${reserva.status}).`
        });
      }

      if (reserva.expiresAt < new Date()) {
        await prisma.reserva.update({
          where: { id: reserva.id },
          data: { status: 'EXPIRADA' }
        });

        return res.status(409).json({
          message: 'A reserva expirou. Escolha o horario novamente.'
        });
      }

      if (reserva.patientId && reserva.patientId !== patientId) {
        return res.status(403).json({
          message: 'Essa reserva pertence a outro paciente.'
        });
      }

      const paciente = await prisma.patient.findUnique({
        where: { id: patientId }
      });

      if (!paciente) {
        return res.status(404).json({ message: 'Paciente nao encontrado.' });
      }

      const agendamento = await prisma.$transaction(async (tx) => {
        const ocupados = await carregarOcupados(tx, {
          therapistId: reserva.therapistId,
          inicio: reserva.horario_atendimento,
          fim: new Date(reserva.horario_atendimento.getTime() + 1),
          ignorarReservaId: reserva.id
        });

        if (ocupados.has(reserva.horario_atendimento.toISOString())) {
          const conflito = new Error('HORARIO_OCUPADO');
          conflito.code = 'HORARIO_OCUPADO';
          throw conflito;
        }

        const criado = await tx.appointment.create({
          data: {
            descricao:
              req.body?.descricao ||
              `Consulta com ${reserva.therapist.nomeCompleto}`,
            horario_atendimento: reserva.horario_atendimento,
            data_atendimento: reserva.data_atendimento,
            status: 'AGUARDANDO_PAGAMENTO',
            modalidade: reserva.modalidade,
            valor: reserva.valor,
            duracaoMinutos: reserva.duracaoMinutos,
            availabilityId: reserva.availabilityId,
            expiresAt: new Date(Date.now() + minutosDePagamento() * 60000),
            patientId,
            therapistId: reserva.therapistId
          },
          include: { patient: true, therapist: true }
        });

        await tx.reserva.update({
          where: { id: reserva.id },
          data: {
            status: 'CONVERTIDA',
            patientId,
            appointmentId: criado.id
          }
        });

        return criado;
      });

      await notificarAgendamento(prisma, agendamento, {
        tipo: 'AGENDAMENTO_CRIADO',
        titulo: 'Agendamento iniciado',
        mensagemPaciente: `Seu horario com ${agendamento.therapist.nomeCompleto} em ${formatarDataHora(agendamento)} esta reservado. Conclua o pagamento em ate ${minutosDePagamento()} minutos.`,
        mensagemPsicologo: `${agendamento.patient.nomeCompleto} iniciou um agendamento para ${formatarDataHora(agendamento)} e esta finalizando o pagamento.`
      });

      return res.status(201).json({
        message: 'Agendamento criado. Falta concluir o pagamento.',
        prazoPagamentoMinutos: minutosDePagamento(),
        agendamento: serializeAppointment(agendamento)
      });
    } catch (error) {
      if (error.code === 'HORARIO_OCUPADO') {
        return res.status(409).json({
          message: 'Esse horario acabou de ser ocupado. Escolha outro.'
        });
      }

      console.error(error);
      return res.status(500).json({ message: 'Erro ao confirmar reserva.' });
    }
  }
};
