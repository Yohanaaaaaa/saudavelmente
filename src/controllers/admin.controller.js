const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

module.exports = {

  async listSolicitations(req, res) {
    const solicitacoes = await prisma.appointment.findMany({
      where: { status: 'PENDENTE' },
      include: {
        user: true,
        therapist: true
      }
    });

    res.json(solicitacoes);
  },

  async listAppointments(req, res) {
    const atendimentos = await prisma.appointment.findMany({
      include: {
        user: true,
        therapist: true,
        payment: true
      }
    });

    res.json(atendimentos);
  },

  async listTherapists(req, res) {
    const therapists = await prisma.therapist.findMany();
    res.json(therapists);
  },

  async listPatients(req, res) {
    const patients = await prisma.user.findMany({
      where: { tipo: 'PACIENTE' }
    });

    res.json(patients);
  }
};
