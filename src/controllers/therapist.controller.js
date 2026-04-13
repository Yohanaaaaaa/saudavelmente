const { PrismaClient } = require('@prisma/client');
const {
  parsePagination,
  buildPaginatedResponse
} = require('../utils/pagination');

const prisma = new PrismaClient();

const THERAPIST_INCLUDE = {
  availabilities: {
    orderBy: [
      { date: 'asc' },
      { startTime: 'asc' }
    ]
  }
};

function normalizeBoolean(value, defaultValue = true) {
  if (value === undefined) return defaultValue;

  if (typeof value === 'boolean') return value;

  if (typeof value === 'string') {
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;
  }

  return Boolean(value);
}

function normalizeAvailabilities(input) {
  if (!Array.isArray(input)) {
    return { data: null, error: null };
  }

  const mapped = [];

  for (const item of input) {
    if (!item || typeof item !== 'object') continue;

    const date = new Date(`${item.date}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime()) || !item.startTime || !item.endTime) {
      return {
        data: null,
        error: 'Cada disponibilidade deve conter date (YYYY-MM-DD), startTime e endTime.'
      };
    }

    mapped.push({
      date,
      startTime: item.startTime,
      endTime: item.endTime,
      isAvailable: normalizeBoolean(item.isAvailable, true)
    });
  }

  return {
    data: mapped.length > 0 ? mapped : null,
    error: null
  };
}

function getUniqueConstraintMessage(error, fallbackMessage) {
  const target = Array.isArray(error?.meta?.target) ? error.meta.target : [];

  if (target.includes('email')) {
    return 'Ja existe profissional com este email.';
  }

  if (target.includes('cpf')) {
    return 'Ja existe profissional com este CPF.';
  }

  if (
    target.includes('therapistId') &&
    target.includes('date') &&
    target.includes('startTime') &&
    target.includes('endTime')
  ) {
    return 'Disponibilidade duplicada para este profissional na mesma data e horario.';
  }

  return fallbackMessage;
}

module.exports = {

  async create(req, res) {
    try {
      const {
        nomeCompleto,
        email,
        horarioDisponivel,
        celular,
        numero_registro,
        abordagem_e_experiencia,
        pix,
        cpf,
        disponibilidades,
        availabilities
      } = req.body;

      const { data: availabilityData, error } = normalizeAvailabilities(
        disponibilidades || availabilities
      );

      if (error) {
        return res.status(400).json({ message: error });
      }

      const therapist = await prisma.therapist.create({
        data: {
          nomeCompleto,
          email,
          celular,
          horarioDisponivel,
          tipo_atendimento: 'SOCIAL',
          verificacao_registro: false,
          numero_registro,
          abordagem_e_experiencia,
          pix,
          cpf,
          ...(availabilityData
            ? {
              availabilities: {
                create: availabilityData
              }
            }
            : {})
        },
        include: THERAPIST_INCLUDE
      });

      return res.status(201).json(therapist);
    } catch (error) {
      console.error(error);

      if (error.code === 'P2002') {
        return res.status(409).json({
          message: getUniqueConstraintMessage(
            error,
            'Ja existe registro com dados unicos informados.'
          )
        });
      }

      return res.status(500).json({
        message: 'Erro ao criar profissional.'
      });
    }
  },

  async list(req, res) {
    try {
      const { page, pageSize, skip, take } = parsePagination(req.query, {
        defaultPageSize: 10
      });

      const [total, therapists] = await prisma.$transaction([
        prisma.therapist.count(),
        prisma.therapist.findMany({
          include: THERAPIST_INCLUDE,
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

  async findById(req, res) {
    const { id } = req.params;

    try {
      const therapist = await prisma.therapist.findUnique({
        where: {
          id: Number(id)
        },
        include: THERAPIST_INCLUDE
      });

      if (!therapist) return res.status(404).json({ error: 'Therapist not found' });

      return res.json(therapist);
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        message: 'Erro ao buscar profissional.'
      });
    }
  },

  async dashboardProfissional(req, res) {
    const { profissionalid } = req.params;

    try {
      const atendimentos = await prisma.appointment.findMany({
        where: {
          therapistId: Number(profissionalid)
        }
      });

      const aRealizar = atendimentos.filter(
        (a) => a.status === 'PENDENTE'
      );

      const realizados = atendimentos.filter(
        (a) => a.status === 'APROVADO'
      ).length;

      const valorAReceber = realizados * 50;

      return res.json({
        profissionalId: profissionalid,
        aRealizar,
        realizados,
        valorAReceber
      });

    } catch (error) {
      console.error(error);
      return res.status(500).json({
        message: 'Erro ao buscar atendimentos do profissional'
      });
    }
  },

  async updateByTherapist(req, res) {
    const { therapistid } = req.params;
    const data = req.body;

    try {
      const terapeutaAtualizado = await prisma.therapist.update({
        where: {
          id: Number(therapistid)
        },
        data,
        include: THERAPIST_INCLUDE
      });

      return res.json(terapeutaAtualizado);

    } catch (error) {
      console.error(error);

      if (error.code === 'P2025') {
        return res.status(404).json({
          message: 'Profissional nao encontrado'
        });
      }

      if (error.code === 'P2002') {
        return res.status(409).json({
          message: getUniqueConstraintMessage(
            error,
            'Ja existe registro com dados unicos informados.'
          )
        });
      }

      return res.status(500).json({
        message: 'Erro ao atualizar dados do profissional'
      });
    }
  },

  async delete(req, res) {
    const { therapistid } = req.params;
    const therapistId = Number(therapistid);

    if (!Number.isInteger(therapistId) || therapistId <= 0) {
      return res.status(400).json({
        message: 'ID de profissional invalido'
      });
    }

    try {
      await prisma.$transaction(async (tx) => {
        const appointments = await tx.appointment.findMany({
          where: { therapistId },
          select: { id: true }
        });

        const appointmentIds = appointments.map((a) => a.id);

        if (appointmentIds.length > 0) {
          await tx.payment.deleteMany({
            where: {
              appointmentId: { in: appointmentIds }
            }
          });

          await tx.appointment.deleteMany({
            where: {
              id: { in: appointmentIds }
            }
          });
        }

        await tx.therapist.delete({
          where: { id: therapistId }
        });
      });

      return res.status(204).send();

    } catch (error) {
      console.error(error);

      if (error.code === 'P2025') {
        return res.status(404).json({
          message: 'Profissional nao encontrado'
        });
      }

      return res.status(500).json({
        message: 'Erro ao deletar profissional'
      });
    }
  }
};
