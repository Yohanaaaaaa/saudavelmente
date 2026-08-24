const { PrismaClient } = require('@prisma/client');
const {
  buildSlotDate,
  carregarOcupados,
  encontrarBlocoDoHorario,
  parseId
} = require('../utils/agenda');
const {
  carregarAgendamentoDoUsuario,
  horasDeAntecedencia,
  podeAlterar
} = require('../utils/agendamento-acesso');
const { serializeAppointment } = require('../utils/appointment-status');
const {
  formatarDataHora,
  montarResumoConsulta,
  notificarAgendamento
} = require('../services/notificacao.service');

const prisma = new PrismaClient();

const STATUS_ALTERAVEIS = [
  'PENDENTE',
  'AGUARDANDO_PAGAMENTO',
  'APROVADO',
  'CONFIRMADO'
];

function orientacoesDaConsulta(appointment) {
  const base = [
    'Chegue com alguns minutos de antecedencia.',
    'Escolha um lugar reservado e com boa conexao.'
  ];

  if (appointment.modalidade === 'PRESENCIAL') {
    return [
      'Chegue com alguns minutos de antecedencia.',
      'Leve um documento com foto.'
    ];
  }

  return base;
}

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

module.exports = {
  /**
   * Dados da tela de sucesso (card P1 - Confirmacao do Agendamento).
   */
  async confirmacao(req, res) {
    const appointmentId = parseId(req.params.id);
    if (!appointmentId) {
      return res.status(400).json({ message: 'id invalido.' });
    }

    try {
      const { appointment, erro, tipo } = await carregarAgendamentoDoUsuario(
        prisma,
        req,
        appointmentId
      );

      if (erro) {
        return res.status(erro.status).json({ message: erro.message });
      }

      const alteracao = podeAlterar(appointment, tipo);

      return res.json({
        status: appointment.status,
        pagamento: appointment.payment
          ? {
              status: appointment.payment.status,
              valor: appointment.payment.valor,
              pagoEm: appointment.payment.pagoEm
            }
          : null,
        consulta: montarResumoConsulta(appointment),
        orientacoes: orientacoesDaConsulta(appointment),
        politica: {
          antecedenciaHoras: horasDeAntecedencia(),
          podeCancelar: alteracao.permitido,
          podeRemarcar: alteracao.permitido,
          observacao: alteracao.permitido
            ? `Cancelamento e remarcacao ate ${horasDeAntecedencia()}h antes da consulta.`
            : alteracao.message
        }
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Erro ao carregar confirmacao.' });
    }
  },

  /**
   * Cancelamento pelo paciente, pelo psicologo ou pelo admin.
   */
  async cancelar(req, res) {
    const appointmentId = parseId(req.params.id);
    if (!appointmentId) {
      return res.status(400).json({ message: 'id invalido.' });
    }

    try {
      const { appointment, erro, tipo } = await carregarAgendamentoDoUsuario(
        prisma,
        req,
        appointmentId
      );

      if (erro) {
        return res.status(erro.status).json({ message: erro.message });
      }

      if (!STATUS_ALTERAVEIS.includes(appointment.status)) {
        return res.status(409).json({
          message: `Agendamento com status ${appointment.status} nao pode ser cancelado.`
        });
      }

      const alteracao = podeAlterar(appointment, tipo);
      if (!alteracao.permitido) {
        return res.status(409).json({ message: alteracao.message });
      }

      const operacoes = [
        prisma.appointment.update({
          where: { id: appointment.id },
          data: {
            status: 'CANCELADO',
            canceladoPor: tipo,
            canceladoEm: new Date(),
            motivoCancelamento: req.body?.motivo || null,
            expiresAt: null
          },
          include: { patient: true, therapist: true }
        })
      ];

      // Pagamento pendente perde a validade; repasse programado nao acontece.
      if (appointment.payment && appointment.payment.status === 'PENDENTE') {
        operacoes.push(
          prisma.payment.update({
            where: { id: appointment.payment.id },
            data: { status: 'CANCELADO' }
          })
        );
      }

      if (appointment.payment) {
        operacoes.push(
          prisma.payout.updateMany({
            where: { paymentId: appointment.payment.id, status: 'PENDENTE' },
            data: { status: 'CANCELADO', observacao: 'Consulta cancelada' }
          })
        );
      }

      const [cancelado] = await prisma.$transaction(operacoes);

      await notificarAgendamento(prisma, cancelado, {
        tipo: 'AGENDAMENTO_CANCELADO',
        titulo: 'Consulta cancelada',
        mensagemPaciente: `Sua consulta de ${formatarDataHora(cancelado)} foi cancelada.`,
        mensagemPsicologo: `A consulta com ${cancelado.patient.nomeCompleto} em ${formatarDataHora(cancelado)} foi cancelada.`
      });

      const pagamentoPago = appointment.payment?.status === 'PAGO';

      return res.json({
        message: 'Agendamento cancelado.',
        reembolso: pagamentoPago
          ? 'Pagamento ja confirmado: o estorno precisa ser tratado pelo suporte.'
          : null,
        agendamento: serializeAppointment(cancelado)
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Erro ao cancelar agendamento.' });
    }
  },

  /**
   * Remarcacao: cria o novo agendamento, leva o pagamento junto e marca o
   * antigo como REMARCADO.
   */
  async remarcar(req, res) {
    const appointmentId = parseId(req.params.id);
    if (!appointmentId) {
      return res.status(400).json({ message: 'id invalido.' });
    }

    try {
      const { appointment, erro, tipo } = await carregarAgendamentoDoUsuario(
        prisma,
        req,
        appointmentId
      );

      if (erro) {
        return res.status(erro.status).json({ message: erro.message });
      }

      if (!STATUS_ALTERAVEIS.includes(appointment.status)) {
        return res.status(409).json({
          message: `Agendamento com status ${appointment.status} nao pode ser remarcado.`
        });
      }

      const alteracao = podeAlterar(appointment, tipo);
      if (!alteracao.permitido) {
        return res.status(409).json({ message: alteracao.message });
      }

      const novoHorario = resolverHorario(req.body);
      if (!novoHorario) {
        return res.status(400).json({
          message: 'Informe data (YYYY-MM-DD) e inicio (HH:MM), ou horario_atendimento.'
        });
      }

      if (novoHorario.getTime() <= Date.now()) {
        return res.status(409).json({
          message: 'Escolha um horario futuro.'
        });
      }

      const therapist = await prisma.therapist.findUnique({
        where: { id: appointment.therapistId }
      });

      const dataAtendimento = novoHorario.toISOString().slice(0, 10);
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
        novoHorario,
        appointment.duracaoMinutos || therapist.duracaoConsulta
      );

      if (!bloco) {
        return res.status(409).json({
          message: 'O psicologo nao atende nesse horario.'
        });
      }

      const novo = await prisma.$transaction(async (tx) => {
        const ocupados = await carregarOcupados(tx, {
          therapistId: therapist.id,
          inicio: novoHorario,
          fim: new Date(novoHorario.getTime() + 1)
        });

        if (ocupados.has(novoHorario.toISOString())) {
          const conflito = new Error('HORARIO_OCUPADO');
          conflito.code = 'HORARIO_OCUPADO';
          throw conflito;
        }

        const criado = await tx.appointment.create({
          data: {
            descricao: appointment.descricao,
            horario_atendimento: novoHorario,
            data_atendimento: dataAtendimento,
            status: appointment.status,
            modalidade: appointment.modalidade,
            valor: appointment.valor,
            duracaoMinutos: appointment.duracaoMinutos,
            availabilityId: bloco.id,
            expiresAt: appointment.expiresAt,
            patientId: appointment.patientId,
            therapistId: appointment.therapistId,
            remarcadoDeId: appointment.id
          },
          include: { patient: true, therapist: true }
        });

        await tx.appointment.update({
          where: { id: appointment.id },
          data: { status: 'REMARCADO', expiresAt: null }
        });

        // O pagamento acompanha o agendamento vigente.
        if (appointment.payment) {
          await tx.payment.update({
            where: { id: appointment.payment.id },
            data: { appointmentId: criado.id }
          });
        }

        return criado;
      });

      await notificarAgendamento(prisma, novo, {
        tipo: 'AGENDAMENTO_REMARCADO',
        titulo: 'Consulta remarcada',
        mensagemPaciente: `Sua consulta foi remarcada para ${formatarDataHora(novo)}.`,
        mensagemPsicologo: `A consulta com ${novo.patient.nomeCompleto} foi remarcada para ${formatarDataHora(novo)}.`
      });

      return res.status(201).json({
        message: 'Agendamento remarcado.',
        agendamento: serializeAppointment(novo),
        agendamentoAnteriorId: appointment.id
      });
    } catch (error) {
      if (error.code === 'HORARIO_OCUPADO') {
        return res.status(409).json({
          message: 'Esse horario acabou de ser ocupado. Escolha outro.'
        });
      }

      console.error(error);
      return res.status(500).json({ message: 'Erro ao remarcar agendamento.' });
    }
  }
};
