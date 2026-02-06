const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

module.exports = {
  async pay(req, res) {
  try {
    const { metodo, nome, email, telefone, cpf } = req.body;

    if (!metodo) return res.status(400).json({ message: "metodo é obrigatório" });
    if (!nome || !email || !telefone || !cpf) {
      return res.status(400).json({ message: "nome, email, telefone e cpf são obrigatórios" });
    }

    const token = process.env.APPMAX_TOKEN;

    const [firstname, ...rest] = String(nome).trim().split(/\s+/);
    const lastname = rest.join(" ");

    // 1) Customer
    const customerResponse = await fetch("https://admin.appmax.com.br/api/v3/customer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        "access-token": token,
        firstname,
        lastname,
        email,
        telephone: telefone,
        postcode: "01010-000",
        address_street: "Rua Exemplo",
        address_street_number: "123",
        address_street_district: "Centro",
        address_city: "São Luís",
        address_state: "MA",
        ip: req.ip,
        products: [{ product_sku: "CONSULTA-001", product_qty: 1 }]
      })
    });

    const customerData = await customerResponse.json();
    console.log("Customer Response:", customerData);
    const customerId = customerData?.data?.id;

    if (!customerId) {
      return res.status(400).json({ message: "Erro ao criar customer na Appmax", details: customerData });
    }

    // 2) Order
    const orderResponse = await fetch("https://admin.appmax.com.br/api/v3/order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        "access-token": token,
        total: 110,
        products: [{ sku: "CONSULTA-001", name: "Consulta psicológica", qty: 1 }],
        shipping: 0,
        customer_id: customerId,
        discount: 0,
        freight_type: "PAC"
      })
    });

    const orderData = await orderResponse.json();
    console.log("Order Response:", orderData);
    const orderId = orderData?.data?.id;

    if (!orderId) {
      return res.status(400).json({ message: "Erro ao criar order na Appmax", details: orderData });
    }

    // 3) PIX
    const pixResponse = await fetch("https://admin.appmax.com.br/api/v3/payment/pix", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        "access-token": token,
        cart: { order_id: orderId },
        customer: { customer_id: customerId },
        payment: {
          pix: {
            document_number: cpf,
            expiration_date: "2027-10-11 12:00:00"
          }
        }
      })
    });

    const pixData = await pixResponse.json();
    console.log("PIX Response:", pixData);

    return res.status(201).json({
      pix: pixData?.data
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erro ao gerar pagamento PIX" });
  }
}

};

