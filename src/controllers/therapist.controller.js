const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

module.exports = {

  async create(req, res) {
    const {
      nome,
      email,
      horario_disponivel,
      tipo_atendimento
    } = req.body;

    const therapist = await prisma.therapist.create({
      data: {
        nome,
        email,
        horario_disponivel,
        tipo_atendimento,
        registro_verificado: false
      }
    });

    res.status(201).json(therapist);
  },

  async list(req, res) {
    const therapists = await prisma.therapist.findMany();
    res.json(therapists);
  }
};
