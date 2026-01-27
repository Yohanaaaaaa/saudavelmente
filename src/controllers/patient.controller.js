const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

module.exports = {

  async create(req, res) {
    const {
      nomeCompleto,
      email,
      cpf,
      celular,
      idade,
      cidade,
      estado
    } = req.body;

    const patient = await prisma.patient.create({
      data: {
        nomeCompleto,
        email,
        cpf,
        celular,
        idade,
        cidade,
        estado
      }
    });

    res.status(201).json(patient);
  },

  async list(req, res) {
    const patients = await prisma.patient.findMany();
    res.json(patients);
  }

};
