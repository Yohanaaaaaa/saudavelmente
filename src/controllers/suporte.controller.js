const { PrismaClient } = require('@prisma/client');
const {
  parsePagination,
  buildPaginatedResponse
} = require('../utils/pagination');
const { notificar } = require('../services/notificacao.service');

const prisma = new PrismaClient();

const STATUS = ['ABERTO', 'EM_ANDAMENTO', 'RESOLVIDO', 'FECHADO'];
const PRIORIDADES = ['BAIXA', 'MEDIA', 'ALTA'];

async function nomeDoUsuario(tipo, id) {
  if (tipo === 'PATIENT') {
    const paciente = await prisma.patient.findUnique({ where: { id } });
    return paciente?.nomeCompleto || 'Paciente';
  }

  if (tipo === 'THERAPIST') {
    const psicologo = await prisma.therapist.findUnique({ where: { id } });
    return psicologo?.nomeCompleto || 'Psicologo';
  }

  const admin = await prisma.admin.findUnique({ where: { id } });
  return admin?.nome || 'Suporte';
}

function podeVerTicket(ticket, req) {
  const tipo = String(req.user?.tipo || '').toUpperCase();

  if (tipo === 'ADMIN') return true;

  return (
    ticket.solicitanteTipo === tipo &&
    ticket.solicitanteId === Number(req.user?.id)
  );
}

module.exports = {
  /**
   * Abertura de chamado (card P1 - Central de Suporte).
   */
  async criar(req, res) {
    const tipo = String(req.user?.tipo || '').toUpperCase();
    const { assunto, descricao, prioridade, appointmentId } = req.body || {};

    if (!assunto || !descricao) {
      return res.status(400).json({ message: 'Informe assunto e descricao.' });
    }

    if (prioridade && !PRIORIDADES.includes(String(prioridade).toUpperCase())) {
      return res.status(400).json({
        message: `prioridade deve ser um de: ${PRIORIDADES.join(', ')}.`
      });
    }

    try {
      const solicitanteId = Number(req.user.id);
      const solicitanteNome = await nomeDoUsuario(tipo, solicitanteId);

      const ticket = await prisma.supportTicket.create({
        data: {
          assunto,
          descricao,
          prioridade: prioridade ? String(prioridade).toUpperCase() : 'MEDIA',
          solicitanteTipo: tipo,
          solicitanteId,
          solicitanteNome,
          appointmentId: appointmentId ? Number(appointmentId) : null,
          mensagens: {
            create: {
              autorTipo: tipo,
              autorId: solicitanteId,
              autorNome: solicitanteNome,
              mensagem: descricao
            }
          }
        },
        include: { mensagens: true }
      });

      return res.status(201).json({
        message: 'Chamado aberto. Nossa equipe vai responder por aqui.',
        ticket
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Erro ao abrir chamado.' });
    }
  },

  /**
   * Chamados do usuario logado.
   */
  async meusTickets(req, res) {
    try {
      const { page, pageSize, skip, take } = parsePagination(req.query, {
        defaultPageSize: 10
      });

      const where = {
        solicitanteTipo: String(req.user.tipo).toUpperCase(),
        solicitanteId: Number(req.user.id)
      };

      if (req.query.status) where.status = String(req.query.status).toUpperCase();

      const [total, tickets] = await prisma.$transaction([
        prisma.supportTicket.count({ where }),
        prisma.supportTicket.findMany({
          where,
          orderBy: { updatedAt: 'desc' },
          skip,
          take,
          include: { _count: { select: { mensagens: true } } }
        })
      ]);

      return res.json(buildPaginatedResponse(tickets, total, page, pageSize));
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Erro ao listar chamados.' });
    }
  },

  async detalhar(req, res) {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: 'id invalido.' });
    }

    try {
      const ticket = await prisma.supportTicket.findUnique({
        where: { id },
        include: { mensagens: { orderBy: { createdAt: 'asc' } } }
      });

      if (!ticket || !podeVerTicket(ticket, req)) {
        return res.status(404).json({ message: 'Chamado nao encontrado.' });
      }

      const ehAdmin = String(req.user.tipo).toUpperCase() === 'ADMIN';

      return res.json({
        ...ticket,
        mensagens: ticket.mensagens.filter((mensagem) => ehAdmin || !mensagem.interna)
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Erro ao carregar chamado.' });
    }
  },

  /**
   * Registra a interacao no chamado, do usuario ou do suporte.
   */
  async responder(req, res) {
    const id = Number(req.params.id);
    const { mensagem } = req.body || {};

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: 'id invalido.' });
    }

    if (!mensagem) {
      return res.status(400).json({ message: 'Informe a mensagem.' });
    }

    try {
      const ticket = await prisma.supportTicket.findUnique({ where: { id } });

      if (!ticket || !podeVerTicket(ticket, req)) {
        return res.status(404).json({ message: 'Chamado nao encontrado.' });
      }

      if (['RESOLVIDO', 'FECHADO'].includes(ticket.status) && String(req.user.tipo).toUpperCase() !== 'ADMIN') {
        return res.status(409).json({
          message: 'Chamado encerrado. Abra um novo chamado se precisar.'
        });
      }

      const tipo = String(req.user.tipo).toUpperCase();
      const autorId = Number(req.user.id);
      const autorNome = await nomeDoUsuario(tipo, autorId);
      const interna = tipo === 'ADMIN' && Boolean(req.body?.interna);

      const [novaMensagem] = await prisma.$transaction([
        prisma.supportMessage.create({
          data: {
            ticketId: ticket.id,
            autorTipo: tipo,
            autorId,
            autorNome,
            mensagem,
            interna
          }
        }),
        prisma.supportTicket.update({
          where: { id: ticket.id },
          data: {
            status: tipo === 'ADMIN' && ticket.status === 'ABERTO'
              ? 'EM_ANDAMENTO'
              : ticket.status
          }
        })
      ]);

      if (tipo === 'ADMIN' && !interna) {
        await notificar(prisma, {
          destinatarioTipo: ticket.solicitanteTipo,
          destinatarioId: ticket.solicitanteId,
          tipo: 'SUPORTE_ATUALIZADO',
          titulo: 'Resposta do suporte',
          mensagem: `Seu chamado "${ticket.assunto}" recebeu uma resposta.`,
          payload: { ticketId: ticket.id }
        });
      }

      return res.status(201).json({ message: 'Mensagem registrada.', mensagem: novaMensagem });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Erro ao responder chamado.' });
    }
  },

  /**
   * Fila do suporte, visao da equipe.
   */
  async listarParaAdmin(req, res) {
    try {
      const { page, pageSize, skip, take } = parsePagination(req.query, {
        defaultPageSize: 20
      });

      const where = {};
      if (req.query.status) where.status = String(req.query.status).toUpperCase();
      if (req.query.prioridade) where.prioridade = String(req.query.prioridade).toUpperCase();

      const [total, tickets, abertos] = await prisma.$transaction([
        prisma.supportTicket.count({ where }),
        prisma.supportTicket.findMany({
          where,
          orderBy: [{ status: 'asc' }, { createdAt: 'asc' }],
          skip,
          take,
          include: { _count: { select: { mensagens: true } } }
        }),
        prisma.supportTicket.count({ where: { status: { in: ['ABERTO', 'EM_ANDAMENTO'] } } })
      ]);

      return res.json({
        emAberto: abertos,
        ...buildPaginatedResponse(tickets, total, page, pageSize)
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Erro ao listar chamados.' });
    }
  },

  async alterarStatus(req, res) {
    const id = Number(req.params.id);
    const status = String(req.body?.status || '').toUpperCase();

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: 'id invalido.' });
    }

    if (!STATUS.includes(status)) {
      return res.status(400).json({ message: `status deve ser um de: ${STATUS.join(', ')}.` });
    }

    try {
      const ticket = await prisma.supportTicket.update({
        where: { id },
        data: {
          status,
          resolvidoEm: ['RESOLVIDO', 'FECHADO'].includes(status) ? new Date() : null
        }
      });

      await notificar(prisma, {
        destinatarioTipo: ticket.solicitanteTipo,
        destinatarioId: ticket.solicitanteId,
        tipo: 'SUPORTE_ATUALIZADO',
        titulo: 'Chamado atualizado',
        mensagem: `Seu chamado "${ticket.assunto}" agora esta ${status}.`,
        payload: { ticketId: ticket.id, status }
      });

      return res.json({ message: `Chamado marcado como ${status}.`, ticket });
    } catch (error) {
      if (error.code === 'P2025') {
        return res.status(404).json({ message: 'Chamado nao encontrado.' });
      }

      console.error(error);
      return res.status(500).json({ message: 'Erro ao atualizar chamado.' });
    }
  }
};
