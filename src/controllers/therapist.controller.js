const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

module.exports = {

  async create(req, res) {
    const {
      nomeCompleto,
      email,
      horarioDisponivel,
      celular,
      numero_registro,
      abordagem_e_experiencia,
      pix,
      cpf
    } = req.body;

    const therapist = await prisma.therapist.create({
      data: {
        nomeCompleto,
        email,
        celular,
        horarioDisponivel,
        tipo_atendimento: "SOCIAL",
        verificacao_registro: false,
        numero_registro,
        abordagem_e_experiencia,
        pix,
        cpf
      }
    });

    res.status(201).json(therapist);
  },

  async list(req, res) {
    const therapists = await prisma.therapist.findMany();
    res.json(therapists);
  }
};
