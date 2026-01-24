const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

export async function create(req, res) {
  const { nome, email } = req.body;

  const patient = await prisma.user.create({
    data: {
      nome,
      email,
      tipo: 'PACIENTE'
    }
  });

  res.status(201).json(patient);
}
export async function list(req, res) {
  const patients = await prisma.user.findMany({
    where: { tipo: 'PACIENTE' }
  });

  res.json(patients);
}
