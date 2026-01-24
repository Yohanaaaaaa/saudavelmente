const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

export async function create(req, res) {
  const { nomeCompleto, email, cpf, celular, idade, cidade, estado } = req.body;

  const patient = await prisma.user.create({
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
}
export async function list(req, res) {
  const patients = await prisma.patient.findMany();
  res.json(patients);
}