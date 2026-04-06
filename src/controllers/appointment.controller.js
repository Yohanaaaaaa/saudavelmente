const { PrismaClient } = require('@prisma/client');
const {
  serializeAppointment,
  serializeAppointments
} = require('../utils/appointment-status');

const prisma = new PrismaClient();

const APPOINTMENT_INCLUDE = {
  therapist: true,
  patient: true,
  payment: true
};

function parseId(id) {
  const numericId = Number(id);
  return Number.isInteger(numericId) && numericId > 0 ? numericId : null;
}

function toDateOnly(value) {
  if (!value) return null;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;

  return parsed.toISOString().slice(0, 10);
}

function normalizeStatus(status) {
  if (!status) return null;

  if (typeof status === 'string') {
    return status.toUpperCase();
  }

  if (typeof status === 'object' && typeof status.code === 'string') {
    return status.code.toUpperCase();
  }

  return null;
}

module.exports = {

  async create(req, res) {
    try {
      const {
        descricao,
        horario_atendimento,
        therapistId,
        patientId,
        data_atendimento
      } = req.body;

      if (!descricao || !horario_atendimento || !therapistId || !patientId) {
        return res.status(400).json({
          message: 'Campos obrigatorios: descricao, horario_atendimento, therapistId e patientId.'
        });
      }

      const dateOnly = data_atendimento || toDateOnly(horario_atendimento);
      if (!dateOnly) {
        return res.status(400).json({
          message: 'horario_atendimento invalido. Utilize um valor de data/hora valido.'
        });
      }

      const appointment = await prisma.appointment.create({
        data: {
          descricao,
          horario_atendimento,
          status: 'PENDENTE',
          data_atendimento: dateOnly,
          patient: {
            connect: { id: Number(patientId) }
          },
          therapist: {
            connect: { id: Number(therapistId) }
          }
        },
        include: APPOINTMENT_INCLUDE
      });

      return res.status(201).json(serializeAppointment(appointment));
    } catch (error) {
      console.error(error);

      if (error.code === 'P2003') {
        return res.status(400).json({
          message: 'Paciente ou profissional informado nao existe.'
        });
      }

      return res.status(500).json({ message: 'Erro ao criar solicitacao.' });
    }
  },

  async getById(req, res) {
    const numericId = parseId(req.params.id);

    if (!numericId) {
      return res.status(400).json({ message: 'ID invalido.' });
    }

    try {
      const appointment = await prisma.appointment.findUnique({
        where: { id: numericId },
        include: APPOINTMENT_INCLUDE
      });

      if (!appointment) {
        return res.status(404).json({ message: 'Solicitacao nao encontrada.' });
      }

      return res.json(serializeAppointment(appointment));
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Erro ao buscar solicitacao.' });
    }
  },

  async list(req, res) {
    try {
      const appointments = await prisma.appointment.findMany({
        include: APPOINTMENT_INCLUDE,
        orderBy: { createdAt: 'desc' }
      });

      return res.json(serializeAppointments(appointments));
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Erro ao listar solicitacoes.' });
    }
  },

  async listPending(req, res) {
    try {
      const pendentes = await prisma.appointment.findMany({
        where: { status: 'PENDENTE' },
        include: APPOINTMENT_INCLUDE,
        orderBy: { createdAt: 'desc' }
      });

      return res.json(serializeAppointments(pendentes));
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Erro ao listar solicitacoes pendentes.' });
    }
  },

  async update(req, res) {
    const numericId = parseId(req.params.id);
    if (!numericId) {
      return res.status(400).json({ message: 'ID invalido.' });
    }

    try {
      const {
        status,
        horario_atendimento,
        descricao,
        data_atendimento,
        therapistId,
        patientId
      } = req.body;

      const data = {};

      if (descricao !== undefined) data.descricao = descricao;
      if (horario_atendimento !== undefined) data.horario_atendimento = horario_atendimento;
      if (therapistId !== undefined) data.therapist = { connect: { id: Number(therapistId) } };
      if (patientId !== undefined) data.patient = { connect: { id: Number(patientId) } };

      const normalizedStatus = normalizeStatus(status);
      if (normalizedStatus) data.status = normalizedStatus;

      if (data_atendimento !== undefined) {
        data.data_atendimento = data_atendimento;
      } else if (horario_atendimento !== undefined) {
        const derivedDate = toDateOnly(horario_atendimento);
        if (derivedDate) data.data_atendimento = derivedDate;
      }

      if (Object.keys(data).length === 0) {
        return res.status(400).json({
          message: 'Nenhum campo valido enviado para atualizacao.'
        });
      }

      const appointment = await prisma.appointment.update({
        where: { id: numericId },
        data,
        include: APPOINTMENT_INCLUDE
      });

      return res.json(serializeAppointment(appointment));
    } catch (error) {
      console.error(error);

      if (error.code === 'P2025') {
        return res.status(404).json({ message: 'Solicitacao nao encontrada.' });
      }

      if (error.code === 'P2003') {
        return res.status(400).json({
          message: 'Paciente ou profissional informado nao existe.'
        });
      }

      return res.status(500).json({ message: 'Erro ao atualizar solicitacao.' });
    }
  },

  async delete(req, res) {
    const numericId = parseId(req.params.id);
    if (!numericId) {
      return res.status(400).json({ message: 'ID invalido.' });
    }

    try {
      await prisma.appointment.delete({
        where: { id: numericId }
      });

      return res.status(204).send();
    } catch (error) {
      if (error.code === 'P2025') {
        return res.status(404).json({ message: 'Solicitacao nao encontrada.' });
      }

      return res.status(500).json({ message: 'Erro ao deletar solicitacao.' });
    }
  },

  async approve(req, res) {
    const numericId = parseId(req.params.id);
    if (!numericId) {
      return res.status(400).json({ message: 'ID invalido.' });
    }

    try {
      const appointment = await prisma.appointment.update({
        where: { id: numericId },
        data: { status: 'APROVADO' },
        include: APPOINTMENT_INCLUDE
      });

      return res.json({
        message: 'Solicitacao aprovada com sucesso.',
        solicitation: serializeAppointment(appointment)
      });
    } catch (error) {
      console.error(error);

      if (error.code === 'P2025') {
        return res.status(404).json({ message: 'Solicitacao nao encontrada.' });
      }

      return res.status(500).json({ message: 'Erro ao aprovar solicitacao.' });
    }
  },

  async reject(req, res) {
    const numericId = parseId(req.params.id);
    if (!numericId) {
      return res.status(400).json({ message: 'ID invalido.' });
    }

    try {
      const appointment = await prisma.appointment.update({
        where: { id: numericId },
        data: { status: 'RECUSADO' },
        include: APPOINTMENT_INCLUDE
      });

      return res.json({
        message: 'Solicitacao recusada com sucesso.',
        solicitation: serializeAppointment(appointment)
      });
    } catch (error) {
      console.error(error);

      if (error.code === 'P2025') {
        return res.status(404).json({ message: 'Solicitacao nao encontrada.' });
      }

      return res.status(500).json({ message: 'Erro ao recusar solicitacao.' });
    }
  }
};
