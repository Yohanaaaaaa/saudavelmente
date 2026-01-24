const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

module.exports = {

  async create(req, res) {
    const { descricao, horario_atendimento, therapistId, userId, tipo_atendimento } = req.body;

    const appointment = await prisma.appointment.create({
      data: {
        descricao,
        horario_atendimento,
        therapistId,
        userId,
        tipo_atendimento,
        status: 'PENDENTE'
      }
    });

    res.status(201).json(appointment);
  },

  async getById(req, res) {
    const { id } = req.params;

    const appointment = await prisma.appointment.findUnique({
      where: { id: Number(id) },
      include: {
        therapist: true,
        user: true,
        payment: true
      }
    });

    if (!appointment) {
      return res.status(404).json({ message: 'Atendimento não encontrado' });
    }

    res.json(appointment);
  },

  async listPending(req, res) {
    const pendentes = await prisma.appointment.findMany({
      where: { status: 'PENDENTE' },
      include: {
        therapist: true,
        user: true
      }
    });

    res.json(pendentes);
  }
};
