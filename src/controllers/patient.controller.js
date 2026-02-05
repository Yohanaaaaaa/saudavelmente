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

  

  async dashboardPaciente(req, res) {
    const { pacienteid } = req.params;

    try {
      const atendimentos = await prisma.appointment.findMany({
        where: {
          patientId: Number(pacienteid)
        },
        orderBy: {
          data: 'asc'
        }
      });

      
      const realizados = atendimentos.filter(
        a => a.status === 'aprovado'
      );

      
      const aRealizar = atendimentos.filter(
        a => a.status === 'pendente'
      );

      return res.json({
        pacienteId: pacienteid,
        realizados,
        aRealizar
      });

    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Erro ao buscar atendimentos' });
    }
  }
  async updateByPatient(req, res) {
    const { patientid } = req.params;
    const data = req.body;

    try {
      const pacienteAtualizado = await prisma.patient.update({
        where: {
          id: Number(patientid)
        },
        data
      });

      return res.json(pacienteAtualizado);

    } catch (error) {
      console.error(error);
      return res.status(500).json({
        message: 'Erro ao atualizar dados do paciente'
      });
    }
  }



};
