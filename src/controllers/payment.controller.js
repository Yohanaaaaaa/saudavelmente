const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

module.exports = {

  async pay(req, res) {
    const { appointmentId } = req.params;
    const { metodo } = req.body;

    const appointment = await prisma.appointment.findUnique({
      where: { id: Number(appointmentId) }
    });

    if (!appointment) {
      return res.status(404).json({ message: 'Atendimento não encontrado' });
    }

    const payment = await prisma.payment.create({
      data: {
        valor: 50,
        metodo,
        status: 'PENDENTE',
        appointmentId: appointment.id
      }
    });

    res.status(201).json(payment);
  }
};
