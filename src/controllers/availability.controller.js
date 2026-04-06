const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function parseId(id) {
  const numericId = Number(id);
  return Number.isInteger(numericId) && numericId > 0 ? numericId : null;
}

function toDateRange(dateValue) {
  if (!dateValue) return null;

  const baseDate = new Date(`${dateValue}T00:00:00.000Z`);
  if (Number.isNaN(baseDate.getTime())) return null;

  const nextDate = new Date(baseDate);
  nextDate.setUTCDate(nextDate.getUTCDate() + 1);

  return { start: baseDate, end: nextDate };
}

function normalizeDate(dateValue) {
  if (!dateValue) return null;

  const parsed = new Date(`${dateValue}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return null;

  return parsed;
}

function normalizeBoolean(value, defaultValue = true) {
  if (value === undefined) return defaultValue;

  if (typeof value === 'boolean') return value;

  if (typeof value === 'string') {
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;
  }

  return Boolean(value);
}

function serializeAvailability(availability) {
  if (!availability) return availability;

  return {
    ...availability,
    date: availability.date.toISOString().slice(0, 10)
  };
}

function serializeAvailabilities(availabilities = []) {
  return availabilities.map(serializeAvailability);
}

module.exports = {
  async create(req, res) {
    const therapistId = parseId(req.params.therapistId);
    if (!therapistId) {
      return res.status(400).json({ message: 'therapistId invalido.' });
    }

    const { date, startTime, endTime, isAvailable = true } = req.body;
    const normalizedDate = normalizeDate(date);

    if (!normalizedDate || !startTime || !endTime) {
      return res.status(400).json({
        message: 'Campos obrigatorios: date (YYYY-MM-DD), startTime e endTime.'
      });
    }

    try {
      const availability = await prisma.therapistAvailability.create({
        data: {
          therapistId,
          date: normalizedDate,
          startTime,
          endTime,
          isAvailable: normalizeBoolean(isAvailable, true)
        },
        include: {
          therapist: true
        }
      });

      return res.status(201).json(serializeAvailability(availability));
    } catch (error) {
      console.error(error);

      if (error.code === 'P2002') {
        return res.status(409).json({
          message: 'Ja existe disponibilidade para esse profissional nessa data e horario.'
        });
      }

      if (error.code === 'P2003') {
        return res.status(400).json({
          message: 'Profissional informado nao existe.'
        });
      }

      return res.status(500).json({ message: 'Erro ao criar disponibilidade.' });
    }
  },

  async listByTherapist(req, res) {
    const therapistId = parseId(req.params.therapistId);
    if (!therapistId) {
      return res.status(400).json({ message: 'therapistId invalido.' });
    }

    const date = req.query.date;
    const dateRange = date ? toDateRange(date) : null;
    if (date && !dateRange) {
      return res.status(400).json({ message: 'date invalida. Use YYYY-MM-DD.' });
    }

    try {
      const availabilities = await prisma.therapistAvailability.findMany({
        where: {
          therapistId,
          ...(dateRange
            ? {
              date: {
                gte: dateRange.start,
                lt: dateRange.end
              }
            }
            : {})
        },
        include: {
          therapist: true
        },
        orderBy: [
          { date: 'asc' },
          { startTime: 'asc' }
        ]
      });

      return res.json(serializeAvailabilities(availabilities));
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Erro ao listar disponibilidades.' });
    }
  },

  async findById(req, res) {
    const availabilityId = parseId(req.params.id);
    if (!availabilityId) {
      return res.status(400).json({ message: 'ID invalido.' });
    }

    try {
      const availability = await prisma.therapistAvailability.findUnique({
        where: { id: availabilityId },
        include: {
          therapist: true
        }
      });

      if (!availability) {
        return res.status(404).json({ message: 'Disponibilidade nao encontrada.' });
      }

      return res.json(serializeAvailability(availability));
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Erro ao buscar disponibilidade.' });
    }
  },

  async update(req, res) {
    const availabilityId = parseId(req.params.id);
    if (!availabilityId) {
      return res.status(400).json({ message: 'ID invalido.' });
    }

    try {
      const {
        date,
        startTime,
        endTime,
        isAvailable,
        therapistId
      } = req.body;

      const data = {};

      if (date !== undefined) {
        const normalizedDate = normalizeDate(date);
        if (!normalizedDate) {
          return res.status(400).json({
            message: 'date invalida. Use YYYY-MM-DD.'
          });
        }
        data.date = normalizedDate;
      }

      if (startTime !== undefined) data.startTime = startTime;
      if (endTime !== undefined) data.endTime = endTime;
      if (isAvailable !== undefined) {
        data.isAvailable = normalizeBoolean(isAvailable, true);
      }
      if (therapistId !== undefined) data.therapistId = Number(therapistId);

      if (Object.keys(data).length === 0) {
        return res.status(400).json({
          message: 'Nenhum campo valido enviado para atualizacao.'
        });
      }

      const availability = await prisma.therapistAvailability.update({
        where: { id: availabilityId },
        data,
        include: {
          therapist: true
        }
      });

      return res.json(serializeAvailability(availability));
    } catch (error) {
      console.error(error);

      if (error.code === 'P2025') {
        return res.status(404).json({ message: 'Disponibilidade nao encontrada.' });
      }

      if (error.code === 'P2002') {
        return res.status(409).json({
          message: 'Ja existe disponibilidade para esse profissional nessa data e horario.'
        });
      }

      if (error.code === 'P2003') {
        return res.status(400).json({ message: 'Profissional informado nao existe.' });
      }

      return res.status(500).json({ message: 'Erro ao atualizar disponibilidade.' });
    }
  },

  async delete(req, res) {
    const availabilityId = parseId(req.params.id);
    if (!availabilityId) {
      return res.status(400).json({ message: 'ID invalido.' });
    }

    try {
      await prisma.therapistAvailability.delete({
        where: { id: availabilityId }
      });

      return res.status(204).send();
    } catch (error) {
      if (error.code === 'P2025') {
        return res.status(404).json({ message: 'Disponibilidade nao encontrada.' });
      }

      return res.status(500).json({ message: 'Erro ao deletar disponibilidade.' });
    }
  },

  async listAvailableProfessionalsByDate(req, res) {
    const date = req.query.date;
    const dateRange = toDateRange(date);

    if (!date || !dateRange) {
      return res.status(400).json({
        message: 'Informe o parametro date no formato YYYY-MM-DD.'
      });
    }

    try {
      const records = await prisma.therapistAvailability.findMany({
        where: {
          date: {
            gte: dateRange.start,
            lt: dateRange.end
          },
          isAvailable: true
        },
        include: {
          therapist: true
        },
        orderBy: [
          { therapistId: 'asc' },
          { startTime: 'asc' }
        ]
      });

      const groupedByProfessional = new Map();

      for (const record of records) {
        if (!groupedByProfessional.has(record.therapistId)) {
          groupedByProfessional.set(record.therapistId, {
            therapist: record.therapist,
            availabilities: []
          });
        }

        groupedByProfessional
          .get(record.therapistId)
          .availabilities
          .push(serializeAvailability(record));
      }

      return res.json({
        date,
        professionals: Array.from(groupedByProfessional.values())
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        message: 'Erro ao listar profissionais disponiveis por data.'
      });
    }
  }
};
