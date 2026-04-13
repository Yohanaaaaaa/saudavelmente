const { PrismaClient } = require('@prisma/client');
const { serializeAppointments } = require('../utils/appointment-status');
const {
  parsePagination,
  buildPaginatedResponse
} = require('../utils/pagination');

const prisma = new PrismaClient();

function parseId(id) {
  const numericId = Number(id);
  return Number.isInteger(numericId) && numericId > 0 ? numericId : null;
}

module.exports = {
  async listSolicitations(req, res) {
    try {
      const { page, pageSize, skip, take } = parsePagination(req.query, {
        defaultPageSize: 10
      });
      const { patientId, therapistId } = req.query;

      const where = { status: 'PENDENTE' };

      if (patientId !== undefined) {
        const parsedPatientId = parseId(patientId);
        if (!parsedPatientId) {
          return res.status(400).json({
            message: 'patientId deve ser inteiro positivo.'
          });
        }
        where.patientId = parsedPatientId;
      }

      if (therapistId !== undefined) {
        const parsedTherapistId = parseId(therapistId);
        if (!parsedTherapistId) {
          return res.status(400).json({
            message: 'therapistId deve ser inteiro positivo.'
          });
        }
        where.therapistId = parsedTherapistId;
      }

      const [total, solicitacoes] = await prisma.$transaction([
        prisma.appointment.count({ where }),
        prisma.appointment.findMany({
          where,
          include: {
            patient: true,
            therapist: true,
            payment: true
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take
        })
      ]);

      return res.json(
        buildPaginatedResponse(
          serializeAppointments(solicitacoes),
          total,
          page,
          pageSize
        )
      );
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        message: 'Erro ao listar solicitacoes pendentes.'
      });
    }
  },

  async listAppointments(req, res) {
    try {
      const { page, pageSize, skip, take } = parsePagination(req.query, {
        defaultPageSize: 10
      });
      const { patientId, therapistId } = req.query;

      const where = {};

      if (patientId !== undefined) {
        const parsedPatientId = parseId(patientId);
        if (!parsedPatientId) {
          return res.status(400).json({
            message: 'patientId deve ser inteiro positivo.'
          });
        }
        where.patientId = parsedPatientId;
      }

      if (therapistId !== undefined) {
        const parsedTherapistId = parseId(therapistId);
        if (!parsedTherapistId) {
          return res.status(400).json({
            message: 'therapistId deve ser inteiro positivo.'
          });
        }
        where.therapistId = parsedTherapistId;
      }

      const [total, atendimentos] = await prisma.$transaction([
        prisma.appointment.count({ where }),
        prisma.appointment.findMany({
          where,
          include: {
            patient: true,
            therapist: true,
            payment: true
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take
        })
      ]);

      return res.json(
        buildPaginatedResponse(
          serializeAppointments(atendimentos),
          total,
          page,
          pageSize
        )
      );
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        message: 'Erro ao listar atendimentos.'
      });
    }
  },

  async listTherapists(req, res) {
    try {
      const { page, pageSize, skip, take } = parsePagination(req.query, {
        defaultPageSize: 10
      });

      const [total, therapists] = await prisma.$transaction([
        prisma.therapist.count(),
        prisma.therapist.findMany({
          include: {
            availabilities: {
              orderBy: [
                { date: 'asc' },
                { startTime: 'asc' }
              ]
            }
          },
          orderBy: { id: 'asc' },
          skip,
          take
        })
      ]);

      return res.json(
        buildPaginatedResponse(therapists, total, page, pageSize)
      );
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        message: 'Erro ao listar profissionais.'
      });
    }
  },

  async listPatients(req, res) {
    try {
      const { page, pageSize, skip, take } = parsePagination(req.query, {
        defaultPageSize: 10
      });

      const [total, patients] = await prisma.$transaction([
        prisma.patient.count(),
        prisma.patient.findMany({
          orderBy: { id: 'asc' },
          skip,
          take
        })
      ]);

      return res.json(
        buildPaginatedResponse(patients, total, page, pageSize)
      );
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        message: 'Erro ao listar pacientes.'
      });
    }
  }
};
