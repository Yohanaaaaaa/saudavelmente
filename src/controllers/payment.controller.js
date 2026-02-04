const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

module.exports = {
  async pay(req, res) {
    try {
      const { appointmentId } = req.params;
      const { metodo } = req.body;

      const appointment = await prisma.appointment.findUnique({
        where: { id: Number(appointmentId) },
        include: {
          patient: true
        }
      });

      if (!appointment) {
        return res.status(404).json({ message: 'Atendimento não encontrado' });
      }

      
      const payment = await prisma.payment.create({
        data: {
          valor: 110,
          metodo,
          status: 'PENDENTE',
          appointmentId: appointment.id
        }
      });

      const token = process.env.APPMAX_TOKEN;

      
      const customerResponse = await fetch(
        'https://admin.appmax.com.br/api/v3/customer',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            "access-token": token,
            "firstname": appointment.patient.nomeCompleto.split(' ')[0],
            "lastname": appointment.patient.nomeCompleto.split(' ').slice(1).join(' '),
            "email": appointment.patient.email,
            "telephone": appointment.patient.celular,
            "postcode": "01010-000",
            "address_street": "Rua Exemplo",
            "address_street_number": "123",
            "address_street_district": "Centro",
            "address_city": appointment.patient.cidade,
            "address_state": appointment.patient.estado,
            "ip": req.ip,
            "products": [
              {
                "product_sku": "CONSULTA-001",
                "product_qty": 1
              }
            ]
          })
        }
      );

      const customerData = await customerResponse.json();
      const customerId = customerData.data.id;

      
      const orderResponse = await fetch(
        'https://admin.appmax.com.br/api/v3/order',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            "access-token": token,
            "total": 110,
            "products": [
              {
                "sku": "CONSULTA-001",
                "name": "Consulta psicológica",
                "qty": 1
              }
            ],
            "shipping": 0,
            "customer_id": customerId,
            "discount": 0,
            "freight_type": "PAC"
          })
        }
      );

      const orderData = await orderResponse.json();
      const orderId = orderData.data.order_id;

      
      const pixResponse = await fetch(
        'https://admin.appmax.com.br/api/v3/payment/pix',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            "access-token": token,
            "cart": {
              "order_id": orderId
            },
            "customer": {
              "customer_id": customerId
            },
            "payment": {
              "pix": {
                "document_number": appointment.patient.cpf,
                "expiration_date": "2027-10-11 12:00:00"
              }
            }
          })
        }
      );

      const pixData = await pixResponse.json();

      
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          gatewayId: orderId.toString(),
        }
      });

      return res.status(201).json({
        paymentId: payment.id,
        pix: pixData.data
      });

    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Erro ao gerar pagamento PIX' });
    }
  }
};

