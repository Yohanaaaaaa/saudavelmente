const { PrismaClient } = require('@prisma/client');
const { serializeAppointments } = require('../utils/appointment-status');

const prisma = new PrismaClient();

module.exports = {

  async listSolicitations(req, res) {
    try {
      const solicitacoes = await prisma.appointment.findMany({
        where: { status: 'PENDENTE' },
        include: {
          patient: true,
          therapist: true,
          payment: true
        },
        orderBy: { createdAt: 'desc' }
      });

      return res.json(serializeAppointments(solicitacoes));
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        message: 'Erro ao listar solicitacoes pendentes.'
      });
    }
  },

  async listAppointments(req, res) {
    try {
      const atendimentos = await prisma.appointment.findMany({
        include: {
          patient: true,
          therapist: true,
          payment: true
        },
        orderBy: { createdAt: 'desc' }
      });

      return res.json(serializeAppointments(atendimentos));
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        message: 'Erro ao listar atendimentos.'
      });
    }
  },

  async listTherapists(req, res) {
    const therapists = await prisma.therapist.findMany({
      include: {
        availabilities: {
          orderBy: [
            { date: 'asc' },
            { startTime: 'asc' }
          ]
        }
      }
    });

    res.json(therapists);
  },

  async listPatients(req, res) {
    const patients = await prisma.patient.findMany();

    res.json(patients);
  }
};
