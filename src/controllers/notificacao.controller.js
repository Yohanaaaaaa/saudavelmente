const { PrismaClient } = require('@prisma/client');
const {
  parsePagination,
  buildPaginatedResponse
} = require('../utils/pagination');

const prisma = new PrismaClient();

function destinatarioDoToken(req) {
  return {
    destinatarioTipo: String(req.user?.tipo || '').toUpperCase(),
    destinatarioId: Number(req.user?.id)
  };
}

function serializeNotificacao(notificacao) {
  return {
    id: notificacao.id,
    tipo: notificacao.tipo,
    titulo: notificacao.titulo,
    mensagem: notificacao.mensagem,
    lida: notificacao.lida,
    lidaEm: notificacao.lidaEm ? notificacao.lidaEm.toISOString() : null,
    agendamentoId: notificacao.appointmentId,
    payload: notificacao.payload,
    createdAt: notificacao.createdAt.toISOString()
  };
}

module.exports = {
  /**
   * Central de notificacoes do usuario logado (card P1).
   */
  async listar(req, res) {
    try {
      const { page, pageSize, skip, take } = parsePagination(req.query, {
        defaultPageSize: 20
      });

      const where = destinatarioDoToken(req);

      if (req.query.lida !== undefined) {
        where.lida = String(req.query.lida).toLowerCase() === 'true';
      }

      if (req.query.tipo) {
        where.tipo = String(req.query.tipo).toUpperCase();
      }

      const [total, naoLidas, notificacoes] = await prisma.$transaction([
        prisma.notification.count({ where }),
        prisma.notification.count({
          where: { ...destinatarioDoToken(req), lida: false }
        }),
        prisma.notification.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take
        })
      ]);

      return res.json({
        naoLidas,
        ...buildPaginatedResponse(
          notificacoes.map(serializeNotificacao),
          total,
          page,
          pageSize
        )
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Erro ao listar notificacoes.' });
    }
  },

  async contarNaoLidas(req, res) {
    try {
      const naoLidas = await prisma.notification.count({
        where: { ...destinatarioDoToken(req), lida: false }
      });

      return res.json({ naoLidas });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Erro ao contar notificacoes.' });
    }
  },

  async marcarLida(req, res) {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: 'id invalido.' });
    }

    try {
      const notificacao = await prisma.notification.findUnique({ where: { id } });
      const dono = destinatarioDoToken(req);

      if (
        !notificacao ||
        notificacao.destinatarioTipo !== dono.destinatarioTipo ||
        notificacao.destinatarioId !== dono.destinatarioId
      ) {
        return res.status(404).json({ message: 'Notificacao nao encontrada.' });
      }

      const atualizada = await prisma.notification.update({
        where: { id },
        data: { lida: true, lidaEm: new Date() }
      });

      return res.json(serializeNotificacao(atualizada));
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Erro ao marcar notificacao.' });
    }
  },

  async marcarTodasLidas(req, res) {
    try {
      const resultado = await prisma.notification.updateMany({
        where: { ...destinatarioDoToken(req), lida: false },
        data: { lida: true, lidaEm: new Date() }
      });

      return res.json({
        message: 'Notificacoes marcadas como lidas.',
        atualizadas: resultado.count
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Erro ao marcar notificacoes.' });
    }
  }
};
