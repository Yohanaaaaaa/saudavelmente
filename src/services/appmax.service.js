/**
 * Integracao com a Appmax (cobranca PIX).
 *
 * O token continua com o valor antigo como fallback para nao derrubar o
 * ambiente que ja esta rodando, mas o correto e definir APPMAX_ACCESS_TOKEN
 * no .env e rotacionar o token que estava fixo no codigo.
 */
const BASE_URL = process.env.APPMAX_BASE_URL || 'https://admin.appmax.com.br/api/v3';
const ACCESS_TOKEN =
  process.env.APPMAX_ACCESS_TOKEN || '0F6CA998-B737844E-4C736A0D-F08E1F40';

const SKU_CONSULTA = process.env.APPMAX_SKU || 'CONSULTA-001';

function splitNome(nome) {
  const [firstname, ...rest] = String(nome || '').trim().split(/\s+/);

  return {
    firstname: firstname || 'Paciente',
    lastname: rest.join(' ') || 'Saudavelmente'
  };
}

function apenasDigitos(value) {
  return String(value || '').replace(/\D/g, '');
}

function formatarExpiracao(date) {
  // A Appmax espera "YYYY-MM-DD HH:MM:SS".
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

async function post(path, payload) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 'access-token': ACCESS_TOKEN, ...payload })
  });

  const data = await response.json().catch(() => null);

  return { ok: response.ok, status: response.status, data };
}

async function criarCliente({ nome, email, telefone, cpf, ip }) {
  const { firstname, lastname } = splitNome(nome);

  const { data } = await post('/customer', {
    firstname,
    lastname,
    email,
    telephone: apenasDigitos(telefone),
    document_number: apenasDigitos(cpf),
    postcode: process.env.APPMAX_POSTCODE || '01010-000',
    address_street: process.env.APPMAX_ADDRESS_STREET || 'Rua Exemplo',
    address_street_number: process.env.APPMAX_ADDRESS_NUMBER || '123',
    address_street_district: process.env.APPMAX_ADDRESS_DISTRICT || 'Centro',
    address_city: process.env.APPMAX_ADDRESS_CITY || 'Sao Luis',
    address_state: process.env.APPMAX_ADDRESS_STATE || 'MA',
    ip,
    products: [{ product_sku: SKU_CONSULTA, product_qty: 1 }]
  });

  return { id: data?.data?.id || null, raw: data };
}

async function criarPedido({ customerId, valor, descricao }) {
  const { data } = await post('/order', {
    total: valor,
    products: [
      {
        sku: SKU_CONSULTA,
        name: descricao || 'Consulta psicologica',
        qty: 1,
        price: valor
      }
    ],
    shipping: 0,
    discount: 0,
    customer_id: customerId,
    freight_type: 'PAC'
  });

  return { id: data?.data?.id || null, raw: data };
}

async function gerarPix({ orderId, customerId, cpf, expiraEm }) {
  const { data } = await post('/payment/pix', {
    cart: { order_id: Number(orderId) },
    customer: { customer_id: Number(customerId) },
    payment: {
      pix: {
        document_number: apenasDigitos(cpf),
        expiration_date: formatarExpiracao(expiraEm)
      }
    }
  });

  const pix = data?.data || {};

  return {
    qrCode: pix.pix_qrcode || pix.qrcode || pix.pix_qr_code || null,
    copiaECola: pix.pix_emv || pix.emv || pix.pix_copia_cola || null,
    expiraEm: pix.pix_expiration_date || null,
    pago: data?.text === 'Order Already Paid',
    raw: data
  };
}

/**
 * A Appmax nao expoe um GET de status nesse fluxo, entao reconsultamos o
 * endpoint de PIX com os dados reais do pedido. Quando o pedido ja foi pago a
 * API responde "Order Already Paid". O caminho principal de confirmacao segue
 * sendo o webhook.
 */
async function consultarStatusPedido({ orderId, customerId, cpf, expiraEm }) {
  const resultado = await gerarPix({
    orderId,
    customerId,
    cpf,
    expiraEm: expiraEm || new Date(Date.now() + 30 * 60000)
  });

  return { pago: resultado.pago, raw: resultado.raw };
}

const EVENTOS_DE_PAGAMENTO = [
  'OrderPaid',
  'OrderApproved',
  'OrderPixPaid',
  'PaymentApproved'
];

function eventoConfirmaPagamento(evento) {
  if (!evento) return false;

  const normalizado = String(evento).replace(/[^a-zA-Z]/g, '').toLowerCase();

  return EVENTOS_DE_PAGAMENTO.some(
    (item) => item.toLowerCase() === normalizado
  );
}

module.exports = {
  ACCESS_TOKEN,
  BASE_URL,
  consultarStatusPedido,
  criarCliente,
  criarPedido,
  eventoConfirmaPagamento,
  formatarExpiracao,
  gerarPix
};
