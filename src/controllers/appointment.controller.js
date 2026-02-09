const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

module.exports = {

  async create(req, res) {
    const { descricao, horario_atendimento, therapistId, patientId, tipo_atendimento } = req.body;

    const appointment = await prisma.appointment.create({
      data: {
        descricao,
        horario_atendimento,
        status: 'PENDENTE',
        data_atendimento: "x",

        patient: {
          connect: { id: patientId }
        },

        therapist: {
          connect: { id: therapistId }
        }
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
        patient: true,
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
        patient: true
      }
    });

    res.json(pendentes);
  },

  async update(req, res) {
    const { id } = req.params;
    const { status, horario_atendimento, descricao, data_atendimento } = req.body;

    try {
      const appointment = await prisma.appointment.update({
        where: { id: Number(id) },
        data: {
          status,
          horario_atendimento,
          descricao,
          data_atendimento
        }
      });

      return res.json(appointment);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Erro ao atualizar atendimento' });
    }
  },

  async delete(req, res) {
    const { id } = req.params;

    try {
      await prisma.appointment.delete({
        where: { id: Number(id) }
      });

      return res.status(204).send();
    } catch (error) {
      return res.status(500).json({ message: 'Erro ao deletar atendimento' });
    }
  }
};
