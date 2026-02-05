const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

module.exports = {

  async create(req, res) {
    const {
      nomeCompleto,
      email,
      horarioDisponivel,
      celular,
      numero_registro,
      abordagem_e_experiencia,
      pix
    } = req.body;

    const therapist = await prisma.therapist.create({
      data: {
        nomeCompleto,
        email,
        celular,
        horarioDisponivel,
        tipo_atendimento: "SOCIAL",
        verificacao_registro: false,
        numero_registro,
        abordagem_e_experiencia,
        pix
      }
    });

    res.status(201).json(therapist);
  },

  async list(req, res) {
    const therapists = await prisma.therapist.findMany();
    res.json(therapists);
  }

  async dashboardProfissional(req, res) {
    const { profissionalid } = req.params;

    try {
      const atendimentos = await prisma.appointment.findMany({
        where: {
          therapistId: Number(profissionalid)
        },
        orderBy: {
          data: 'asc'
        }
      });

      const aRealizar = atendimentos.filter(
        a => a.status === 'pendente'
      );

      
      const realizados = atendimentos.filter(
        a => a.status === 'aprovado'
      ).length;

      return res.json({
        profissionalId: profissionalid,
        aRealizar,
        realizados
      });

    } catch (error) {
      console.error(error);
      return res.status(500).json({
        message: 'Erro ao buscar atendimentos do profissional'
      });
    }
  }
  async updateByTherapist(req, res) {
    const { therapistid } = req.params;
    const data = req.body;

    try {
      const terapeutaAtualizado = await prisma.therapist.update({
        where: {
          id: Number(therapistid)
        },
        data
      });

      return res.json(terapeutaAtualizado);

    } catch (error) {
      console.error(error);
      return res.status(500).json({
        message: 'Erro ao atualizar dados do profissional'
      });
    }
  }
};
