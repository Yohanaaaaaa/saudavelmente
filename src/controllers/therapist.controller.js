const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

module.exports = {

  async create(req, res) {
    const {
      nomeCompleto,
      email,
      horarioDisponivel,
      tipo_atendimento,
      celular,
      verificacao_registro,
      abordagem_e_experiencia,
      pix
    } = req.body;

    const therapist = await prisma.therapist.create({
      data: {
        nomeCompleto,
        email,
        celular,
        horarioDisponivel,
        tipo_atendimento,
        verificacao_registro: false,
        numero_registro,
        abordagem_e_experiencia,
        pix
      }
    });

    res.status(201).json(therapist);
  },

  async list(req, res) {
    const therapists = await prisma.therapist.findMany();
    res.json(therapists);
  }
};
