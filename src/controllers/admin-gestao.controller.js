const { PrismaClient } = require('@prisma/client');
const {
  parsePagination,
  buildPaginatedResponse
} = require('../utils/pagination');
const { normalizeDate, addDays } = require('../utils/agenda');
const { serializeAppointments } = require('../utils/appointment-status');
const { notificar, contatoDoPsicologo } = require('../services/notificacao.service');

const prisma = new PrismaClient();

const STATUS_CADASTRO = ['PENDENTE', 'APROVADO', 'REJEITADO'];

function periodoDaQuery(query, campo) {
  const de = query.de ? normalizeDate(query.de) : null;
  const ate = query.ate ? normalizeDate(query.ate) : null;

  if (!de && !ate) return {};

  const filtro = {};
  if (de) filtro.gte = de;
  if (ate) filtro.lt = addDays(ate, 1);

  return { [campo]: filtro };
}

module.exports = {
  /**
   * Gestao de psicologos (card P1).
   */
  async listarPsicologos(req, res) {
    try {
      const { page, pageSize, skip, take } = parsePagination(req.query, {
        defaultPageSize: 20
      });

      const where = {};

      if (req.query.status) {
        where.statusCadastro = String(req.query.status).toUpperCase();
      }

      if (req.query.ativo !== undefined) {
        where.ativo = String(req.query.ativo).toLowerCase() === 'true';
      }

      const busca = String(req.query.busca || '').trim();
      if (busca) {
        where.OR = [
          { nomeCompleto: { contains: busca, mode: 'insensitive' } },
          { email: { contains: busca, mode: 'insensitive' } },
          { numero_registro: { contains: busca, mode: 'insensitive' } }
        ];
      }

      const [total, psicologos] = await prisma.$transaction([
        prisma.therapist.count({ where }),
        prisma.therapist.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take,
          select: {
            id: true,
            nomeCompleto: true,
            email: true,
            celular: true,
            numero_registro: true,
            verificacao_registro: true,
            statusCadastro: true,
            motivoRejeicao: true,
            ativo: true,
            valorConsulta: true,
            especialidades: true,
            createdAt: true,
            _count: { select: { appointments: true, availabilities: true } }
          }
        })
      ]);

      return res.json(buildPaginatedResponse(psicologos, total, page, pageSize));
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Erro ao listar psicologos.' });
    }
  },

  async detalharPsicologo(req, res) {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: 'id invalido.' });
    }

    try {
      const psicologo = await prisma.therapist.findUnique({
        where: { id },
        include: {
          _count: { select: { appointments: true, availabilities: true } }
        }
      });

      if (!psicologo) {
        return res.status(404).json({ message: 'Psicologo nao encontrado.' });
      }

      const [porStatus, repasses] = await Promise.all([
        prisma.appointment.groupBy({
          by: ['status'],
          where: { therapistId: id },
          _count: { _all: true }
        }),
        prisma.payout.aggregate({
          where: { therapistId: id, status: 'PENDENTE' },
          _sum: { valor: true }
        })
      ]);

      const { senha, ...dados } = psicologo;

      return res.json({
        ...dados,
        consultasPorStatus: porStatus.map((item) => ({
          status: item.status,
          total: item._count._all
        })),
        repassePendente: repasses._sum.valor || 0
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Erro ao carregar psicologo.' });
    }
  },

  async alterarStatusCadastro(req, res) {
    const id = Number(req.params.id);
    const status = String(req.body?.status || '').toUpperCase();

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: 'id invalido.' });
    }

    if (!STATUS_CADASTRO.includes(status)) {
      return res.status(400).json({
        message: `status deve ser um de: ${STATUS_CADASTRO.join(', ')}.`
      });
    }

    if (status === 'REJEITADO' && !req.body?.motivo) {
      return res.status(400).json({ message: 'Informe o motivo da rejeicao.' });
    }

    try {
      const psicologo = await prisma.therapist.update({
        where: { id },
        data: {
          statusCadastro: status,
          motivoRejeicao: status === 'REJEITADO' ? req.body.motivo : null,
          verificacao_registro: status === 'APROVADO' ? true : undefined
        }
      });

      if (status !== 'PENDENTE') {
        await notificar(prisma, {
          destinatarioTipo: 'THERAPIST',
          destinatarioId: psicologo.id,
          tipo: status === 'APROVADO' ? 'CADASTRO_APROVADO' : 'CADASTRO_REJEITADO',
          titulo: status === 'APROVADO' ? 'Cadastro aprovado' : 'Cadastro nao aprovado',
          mensagem: status === 'APROVADO'
            ? 'Seu cadastro foi aprovado e seu perfil ja aparece no catalogo.'
            : `Seu cadastro nao foi aprovado. Motivo: ${req.body.motivo}`,
          contato: contatoDoPsicologo(psicologo)
        });
      }

      return res.json({
        message: `Cadastro marcado como ${status}.`,
        psicologo: {
          id: psicologo.id,
          statusCadastro: psicologo.statusCadastro,
          motivoRejeicao: psicologo.motivoRejeicao,
          ativo: psicologo.ativo
        }
      });
    } catch (error) {
      if (error.code === 'P2025') {
        return res.status(404).json({ message: 'Psicologo nao encontrado.' });
      }

      console.error(error);
      return res.status(500).json({ message: 'Erro ao alterar status.' });
    }
  },

  async alterarAtivo(req, res) {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: 'id invalido.' });
    }

    if (req.body?.ativo === undefined) {
      return res.status(400).json({ message: 'Informe ativo (true ou false).' });
    }

    try {
      const psicologo = await prisma.therapist.update({
        where: { id },
        data: { ativo: Boolean(req.body.ativo) }
      });

      return res.json({
        message: psicologo.ativo ? 'Psicologo ativado.' : 'Psicologo desativado.',
        psicologo: { id: psicologo.id, ativo: psicologo.ativo }
      });
    } catch (error) {
      if (error.code === 'P2025') {
        return res.status(404).json({ message: 'Psicologo nao encontrado.' });
      }

      console.error(error);
      return res.status(500).json({ message: 'Erro ao atualizar psicologo.' });
    }
  },

  /**
   * Gestao de pacientes (card P1).
   */
  async detalharPaciente(req, res) {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: 'id invalido.' });
    }

    try {
      const paciente = await prisma.patient.findUnique({ where: { id } });

      if (!paciente) {
        return res.status(404).json({ message: 'Paciente nao encontrado.' });
      }

      const [consultas, gasto] = await Promise.all([
        prisma.appointment.findMany({
          where: { patientId: id },
          include: { therapist: true, payment: true },
          orderBy: { horario_atendimento: 'desc' },
          take: 20
        }),
        prisma.payment.aggregate({
          where: { status: 'PAGO', appointment: { patientId: id } },
          _sum: { valor: true }
        })
      ]);

      const { senha, ...dados } = paciente;

      return res.json({
        ...dados,
        totalPago: gasto._sum.valor || 0,
        ultimasConsultas: serializeAppointments(consultas)
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Erro ao carregar paciente.' });
    }
  },

  /**
   * Gestao de agendamentos (card P1).
   */
  async listarAgendamentos(req, res) {
    try {
      const { page, pageSize, skip, take } = parsePagination(req.query, {
        defaultPageSize: 20
      });

      const where = { ...periodoDaQuery(req.query, 'horario_atendimento') };

      if (req.query.status) {
        const status = String(req.query.status)
          .split(',')
          .map((item) => item.trim().toUpperCase())
          .filter(Boolean);

        if (status.length > 0) where.status = { in: status };
      }

      if (req.query.therapistId) where.therapistId = Number(req.query.therapistId);
      if (req.query.patientId) where.patientId = Number(req.query.patientId);

      const [total, agendamentos] = await prisma.$transaction([
        prisma.appointment.count({ where }),
        prisma.appointment.findMany({
          where,
          include: { patient: true, therapist: true, payment: true },
          orderBy: { horario_atendimento: 'desc' },
          skip,
          take
        })
      ]);

      return res.json(
        buildPaginatedResponse(serializeAppointments(agendamentos), total, page, pageSize)
      );
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Erro ao listar agendamentos.' });
    }
  },

  /**
   * Relatorios da plataforma (card P1).
   */
  async relatorios(req, res) {
    try {
      const periodoConsulta = periodoDaQuery(req.query, 'horario_atendimento');
      const periodoCriacao = periodoDaQuery(req.query, 'createdAt');

      const [
        pacientes,
        pacientesNovos,
        psicologosAprovados,
        psicologosPendentes,
        psicologosAtivos,
        consultasPorStatus,
        receita,
        taxas,
        repassePendente,
        repassePago
      ] = await Promise.all([
        prisma.patient.count(),
        prisma.patient.count({ where: periodoCriacao }),
        prisma.therapist.count({ where: { statusCadastro: 'APROVADO' } }),
        prisma.therapist.count({ where: { statusCadastro: 'PENDENTE' } }),
        prisma.therapist.count({ where: { statusCadastro: 'APROVADO', ativo: true } }),
        prisma.appointment.groupBy({
          by: ['status'],
          where: periodoConsulta,
          _count: { _all: true }
        }),
        prisma.payment.aggregate({
          where: { status: 'PAGO', ...periodoCriacao },
          _sum: { valor: true },
          _count: { _all: true }
        }),
        prisma.payment.aggregate({
          where: { status: 'PAGO', ...periodoCriacao },
          _sum: { taxaPlataforma: true }
        }),
        prisma.payout.aggregate({
          where: { status: 'PENDENTE' },
          _sum: { valor: true }
        }),
        prisma.payout.aggregate({
          where: { status: 'PAGO', ...periodoCriacao },
          _sum: { valor: true }
        })
      ]);

      const porStatus = Object.fromEntries(
        consultasPorStatus.map((item) => [item.status, item._count._all])
      );

      const totalConsultas = consultasPorStatus.reduce(
        (soma, item) => soma + item._count._all,
        0
      );

      const canceladas = porStatus.CANCELADO || 0;
      const pagamentos = receita._count._all || 0;

      return res.json({
        periodo: {
          de: req.query.de || null,
          ate: req.query.ate || null
        },
        usuarios: {
          pacientes,
          pacientesNovosNoPeriodo: pacientesNovos,
          psicologosAprovados,
          psicologosPendentes,
          psicologosAtivos
        },
        consultas: {
          total: totalConsultas,
          porStatus,
          confirmadas: porStatus.CONFIRMADO || 0,
          realizadas: porStatus.REALIZADO || 0,
          canceladas,
          taxaCancelamento: totalConsultas === 0
            ? 0
            : Number(((canceladas / totalConsultas) * 100).toFixed(2))
        },
        financeiro: {
          receitaBruta: receita._sum.valor || 0,
          pagamentosConfirmados: pagamentos,
          ticketMedio: pagamentos === 0
            ? 0
            : Number(((receita._sum.valor || 0) / pagamentos).toFixed(2)),
          taxaPlataforma: taxas._sum.taxaPlataforma || 0,
          repassePendente: repassePendente._sum.valor || 0,
          repassePago: repassePago._sum.valor || 0
        }
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Erro ao gerar relatorios.' });
    }
  },

  /**
   * Repasses aos psicologos (apoia o card P1 - Gestao Financeira).
   */
  async listarRepasses(req, res) {
    try {
      const { page, pageSize, skip, take } = parsePagination(req.query, {
        defaultPageSize: 20
      });

      const where = {};
      if (req.query.status) where.status = String(req.query.status).toUpperCase();
      if (req.query.therapistId) where.therapistId = Number(req.query.therapistId);

      const [total, repasses] = await prisma.$transaction([
        prisma.payout.count({ where }),
        prisma.payout.findMany({
          where,
          include: { therapist: { select: { id: true, nomeCompleto: true, pix: true } } },
          orderBy: { previsaoData: 'asc' },
          skip,
          take
        })
      ]);

      return res.json(buildPaginatedResponse(repasses, total, page, pageSize));
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Erro ao listar repasses.' });
    }
  },

  async pagarRepasse(req, res) {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: 'id invalido.' });
    }

    try {
      const repasse = await prisma.payout.findUnique({ where: { id } });

      if (!repasse) {
        return res.status(404).json({ message: 'Repasse nao encontrado.' });
      }

      if (repasse.status === 'PAGO') {
        return res.status(409).json({ message: 'Esse repasse ja foi pago.' });
      }

      const atualizado = await prisma.payout.update({
        where: { id },
        data: {
          status: 'PAGO',
          pagoEm: new Date(),
          observacao: req.body?.observacao || repasse.observacao
        }
      });

      return res.json({ message: 'Repasse marcado como pago.', repasse: atualizado });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Erro ao pagar repasse.' });
    }
  }
};
