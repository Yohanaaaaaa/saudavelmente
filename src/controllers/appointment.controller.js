const { PrismaClient } = require('@prisma/client');
const {
  serializeAppointment,
  serializeAppointments
} = require('../utils/appointment-status');
const {
  parsePagination,
  buildPaginatedResponse
} = require('../utils/pagination');

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

async function validateAppointmentRelations({ patientId, therapistId }) {
  const checks = [];

  if (patientId !== undefined) {
    checks.push(
      prisma.patient.findUnique({
        where: { id: patientId },
        select: { id: true }
      })
    );
  }

  if (therapistId !== undefined) {
    checks.push(
      prisma.therapist.findUnique({
        where: { id: therapistId },
        select: { id: true }
      })
    );
  }

  const results = await Promise.all(checks);
  let resultIndex = 0;

  if (patientId !== undefined) {
    const patient = results[resultIndex++];
    if (!patient) {
      return { isValid: false, message: 'Paciente informado nao existe.' };
    }
  }

  if (therapistId !== undefined) {
    const therapist = results[resultIndex++];
    if (!therapist) {
      return { isValid: false, message: 'Profissional informado nao existe.' };
    }
  }

  return { isValid: true };
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

      const numericPatientId = parseId(patientId);
      const numericTherapistId = parseId(therapistId);
      if (!numericPatientId || !numericTherapistId) {
        return res.status(400).json({
          message: 'patientId e therapistId devem ser inteiros positivos.'
        });
      }

      const dateOnly = data_atendimento || toDateOnly(horario_atendimento);
      if (!dateOnly) {
        return res.status(400).json({
          message: 'horario_atendimento invalido. Utilize um valor de data/hora valido.'
        });
      }

      const relationValidation = await validateAppointmentRelations({
        patientId: numericPatientId,
        therapistId: numericTherapistId
      });

      if (!relationValidation.isValid) {
        return res.status(404).json({ message: relationValidation.message });
      }

      const appointment = await prisma.appointment.create({
        data: {
          descricao,
          horario_atendimento,
          status: 'PENDENTE',
          data_atendimento: dateOnly,
          patient: {
            connect: { id: numericPatientId }
          },
          therapist: {
            connect: { id: numericTherapistId }
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

      if (error.code === 'P2025') {
        return res.status(404).json({
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
      const { patientId, therapistId } = req.query;
      const { page, pageSize, skip, take } = parsePagination(req.query, {
        defaultPageSize: 10
      });

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

      const [total, appointments] = await prisma.$transaction([
        prisma.appointment.count({ where }),
        prisma.appointment.findMany({
          where,
          include: APPOINTMENT_INCLUDE,
          orderBy: { createdAt: 'desc' },
          skip,
          take
        })
      ]);

      return res.json(
        buildPaginatedResponse(
          serializeAppointments(appointments),
          total,
          page,
          pageSize
        )
      );
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Erro ao listar solicitacoes.' });
    }
  },

  async listPending(req, res) {
    try {
      const { patientId, therapistId } = req.query;
      const { page, pageSize, skip, take } = parsePagination(req.query, {
        defaultPageSize: 10
      });

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

      const [total, pendentes] = await prisma.$transaction([
        prisma.appointment.count({ where }),
        prisma.appointment.findMany({
          where,
          include: APPOINTMENT_INCLUDE,
          orderBy: { createdAt: 'desc' },
          skip,
          take
        })
      ]);

      return res.json(
        buildPaginatedResponse(
          serializeAppointments(pendentes),
          total,
          page,
          pageSize
        )
      );
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
      let numericPatientId;
      let numericTherapistId;

      if (descricao !== undefined) data.descricao = descricao;
      if (horario_atendimento !== undefined) data.horario_atendimento = horario_atendimento;

      if (patientId !== undefined) {
        numericPatientId = parseId(patientId);
        if (!numericPatientId) {
          return res.status(400).json({
            message: 'patientId deve ser inteiro positivo.'
          });
        }
        data.patient = { connect: { id: numericPatientId } };
      }

      if (therapistId !== undefined) {
        numericTherapistId = parseId(therapistId);
        if (!numericTherapistId) {
          return res.status(400).json({
            message: 'therapistId deve ser inteiro positivo.'
          });
        }
        data.therapist = { connect: { id: numericTherapistId } };
      }

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

      if (numericPatientId !== undefined || numericTherapistId !== undefined) {
        const relationValidation = await validateAppointmentRelations({
          patientId: numericPatientId,
          therapistId: numericTherapistId
        });

        if (!relationValidation.isValid) {
          return res.status(404).json({ message: relationValidation.message });
        }
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
        const cause = String(error.meta?.cause || '');
        if (cause.includes('Patient')) {
          return res.status(404).json({ message: 'Paciente informado nao existe.' });
        }
        if (cause.includes('Therapist')) {
          return res.status(404).json({ message: 'Profissional informado nao existe.' });
        }
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
