const { PrismaClient } = require('@prisma/client');
const appmax = require('../services/appmax.service');
const { minutosDePagamento } = require('../utils/expiracao');
const { serializeAppointment } = require('../utils/appointment-status');
const { parseId } = require('../utils/agenda');
const { carregarAgendamentoDoUsuario } = require('../utils/agendamento-acesso');
const {
  formatarDataHora,
  notificarAgendamento
} = require('../services/notificacao.service');

const prisma = new PrismaClient();

function taxaPercentual() {
  const parsed = Number(process.env.PLATAFORMA_TAXA_PERCENTUAL);
  return Number.isFinite(parsed) && parsed >= 0 && parsed < 100 ? parsed : 0;
}

function calcularSplit(valor) {
  const taxa = Number((valor * (taxaPercentual() / 100)).toFixed(2));

  return {
    taxaPlataforma: taxa,
    valorProfissional: Number((valor - taxa).toFixed(2))
  };
}

function serializePayment(payment) {
  if (!payment) return null;

  return {
    id: payment.id,
    status: payment.status,
    metodo: payment.metodo,
    valor: payment.valor,
    qrCode: payment.qrCode,
    copiaECola: payment.copiaECola,
    expiraEm: payment.expiraEm ? payment.expiraEm.toISOString() : null,
    pagoEm: payment.pagoEm ? payment.pagoEm.toISOString() : null,
    orderId: payment.externalOrderId
  };
}

function diasParaRepasse() {
  const parsed = Number(process.env.REPASSE_DIAS);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 7;
}

/**
 * Confirma o pagamento, agenda o repasse do psicologo (card P1 - Gestao
 * Financeira) e avisa as duas pontas (card P1 - Confirmacao do Agendamento).
 */
async function confirmarPagamento(payment) {
  const agendamento = await prisma.appointment.findUnique({
    where: { id: payment.appointmentId },
    include: { patient: true, therapist: true }
  });

  const previsaoData = new Date();
  previsaoData.setDate(previsaoData.getDate() + diasParaRepasse());

  const [pagamentoAtualizado] = await prisma.$transaction([
    prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'PAGO', pagoEm: new Date() }
    }),
    prisma.appointment.update({
      where: { id: payment.appointmentId },
      data: { status: 'CONFIRMADO', expiresAt: null }
    }),
    prisma.payout.upsert({
      where: { paymentId: payment.id },
      create: {
        paymentId: payment.id,
        therapistId: agendamento.therapistId,
        valor: payment.valorProfissional ?? payment.valor,
        previsaoData
      },
      update: {
        valor: payment.valorProfissional ?? payment.valor,
        previsaoData
      }
    })
  ]);

  if (agendamento) {
    const atualizado = { ...agendamento, status: 'CONFIRMADO' };

    await notificarAgendamento(prisma, atualizado, {
      tipo: 'PAGAMENTO_CONFIRMADO',
      titulo: 'Consulta confirmada',
      mensagemPaciente: `Pagamento confirmado. Sua consulta com ${agendamento.therapist.nomeCompleto} esta marcada para ${formatarDataHora(agendamento)}.`,
      mensagemPsicologo: `Nova consulta confirmada com ${agendamento.patient.nomeCompleto} em ${formatarDataHora(agendamento)}.`
    });
  }

  return pagamentoAtualizado;
}

module.exports = {
  /**
   * Gera a cobranca PIX do agendamento (card P0 - Finalizacao do Agendamento
   * e Pagamento). O valor vem do psicologo, nao e mais fixo.
   */
  async criar(req, res) {
    const appointmentId = parseId(req.params.appointmentId);
    if (!appointmentId) {
      return res.status(400).json({ message: 'appointmentId invalido.' });
    }

    try {
      const { appointment, erro } = await carregarAgendamentoDoUsuario(
        prisma,
        req,
        appointmentId
      );

      if (erro) {
        return res.status(erro.status).json({ message: erro.message });
      }

      if (appointment.payment?.status === 'PAGO') {
        return res.status(409).json({
          message: 'Esse agendamento ja esta pago.',
          pagamento: serializePayment(appointment.payment)
        });
      }

      if (!['AGUARDANDO_PAGAMENTO', 'PENDENTE'].includes(appointment.status)) {
        return res.status(409).json({
          message: `Agendamento com status ${appointment.status} nao aceita pagamento.`
        });
      }

      const agora = new Date();

      if (
        appointment.payment &&
        appointment.payment.status === 'PENDENTE' &&
        appointment.payment.expiraEm &&
        appointment.payment.expiraEm > agora &&
        appointment.payment.copiaECola
      ) {
        return res.json({
          message: 'Cobranca PIX ainda valida.',
          pagamento: serializePayment(appointment.payment)
        });
      }

      const valor =
        appointment.valor ?? appointment.therapist.valorConsulta ?? null;

      if (!valor || valor <= 0) {
        return res.status(422).json({
          message: 'O psicologo nao tem valor de consulta configurado.'
        });
      }

      const expiraEm = new Date(
        agora.getTime() + minutosDePagamento() * 60000
      );

      const cliente = await appmax.criarCliente({
        nome: appointment.patient.nomeCompleto,
        email: appointment.patient.email,
        telefone: appointment.patient.celular,
        cpf: appointment.patient.cpf,
        ip: req.ip
      });

      if (!cliente.id) {
        return res.status(502).json({
          message: 'Erro ao criar cliente na Appmax.',
          details: cliente.raw
        });
      }

      const pedido = await appmax.criarPedido({
        customerId: cliente.id,
        valor,
        descricao: `Consulta com ${appointment.therapist.nomeCompleto}`
      });

      if (!pedido.id) {
        return res.status(502).json({
          message: 'Erro ao criar pedido na Appmax.',
          details: pedido.raw
        });
      }

      const pix = await appmax.gerarPix({
        orderId: pedido.id,
        customerId: cliente.id,
        cpf: appointment.patient.cpf,
        expiraEm
      });

      const split = calcularSplit(valor);

      const pagamento = await prisma.payment.upsert({
        where: { appointmentId: appointment.id },
        create: {
          appointmentId: appointment.id,
          valor,
          status: 'PENDENTE',
          metodo: 'PIX',
          provedor: 'appmax',
          externalOrderId: String(pedido.id),
          externalCustomerId: String(cliente.id),
          qrCode: pix.qrCode,
          copiaECola: pix.copiaECola,
          expiraEm,
          ...split
        },
        update: {
          valor,
          status: 'PENDENTE',
          metodo: 'PIX',
          provedor: 'appmax',
          externalOrderId: String(pedido.id),
          externalCustomerId: String(cliente.id),
          qrCode: pix.qrCode,
          copiaECola: pix.copiaECola,
          pagoEm: null,
          expiraEm,
          ...split
        }
      });

      await prisma.appointment.update({
        where: { id: appointment.id },
        data: {
          status: 'AGUARDANDO_PAGAMENTO',
          valor,
          expiresAt: expiraEm
        }
      });

      return res.status(201).json({
        message: 'Cobranca PIX gerada.',
        pagamento: serializePayment(pagamento)
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Erro ao gerar pagamento.' });
    }
  },

  /**
   * Status do pagamento do agendamento. Consulta o provedor com os dados
   * reais gravados na cobranca.
   */
  async status(req, res) {
    const appointmentId = parseId(req.params.appointmentId);
    if (!appointmentId) {
      return res.status(400).json({ message: 'appointmentId invalido.' });
    }

    try {
      const { appointment, erro } = await carregarAgendamentoDoUsuario(
        prisma,
        req,
        appointmentId
      );

      if (erro) {
        return res.status(erro.status).json({ message: erro.message });
      }

      const pagamento = appointment.payment;

      if (!pagamento) {
        return res.status(404).json({
          message: 'Nenhuma cobranca gerada para esse agendamento.'
        });
      }

      if (pagamento.status === 'PAGO') {
        return res.json({
          status: 'PAGO',
          pagamento: serializePayment(pagamento),
          agendamento: serializeAppointment(appointment)
        });
      }

      if (!pagamento.externalOrderId || !pagamento.externalCustomerId) {
        return res.json({
          status: pagamento.status,
          pagamento: serializePayment(pagamento)
        });
      }

      const consulta = await appmax.consultarStatusPedido({
        orderId: pagamento.externalOrderId,
        customerId: pagamento.externalCustomerId,
        cpf: appointment.patient.cpf,
        expiraEm: pagamento.expiraEm
      });

      if (!consulta.pago) {
        return res.json({
          status: pagamento.status,
          pagamento: serializePayment(pagamento)
        });
      }

      const confirmado = await confirmarPagamento(pagamento);
      const atualizado = await prisma.appointment.findUnique({
        where: { id: appointment.id }
      });

      return res.json({
        status: 'PAGO',
        pagamento: serializePayment(confirmado),
        agendamento: serializeAppointment(atualizado)
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Erro ao consultar pagamento.' });
    }
  },

  /**
   * Webhook da Appmax: caminho principal de confirmacao do pagamento.
   * Rota publica, protegida por segredo quando APPMAX_WEBHOOK_SECRET existe.
   */
  async webhook(req, res) {
    const segredoEsperado = process.env.APPMAX_WEBHOOK_SECRET;

    if (segredoEsperado) {
      const recebido =
        req.headers['x-webhook-secret'] || req.query.secret || req.body?.secret;

      if (recebido !== segredoEsperado) {
        return res.status(401).json({ message: 'Assinatura invalida.' });
      }
    }

    try {
      const evento = req.body?.event || req.body?.evento;
      const orderId =
        req.body?.data?.id ??
        req.body?.data?.order_id ??
        req.body?.order_id ??
        null;

      if (!orderId) {
        return res.status(400).json({ message: 'order_id nao informado.' });
      }

      const pagamento = await prisma.payment.findFirst({
        where: { externalOrderId: String(orderId) }
      });

      if (!pagamento) {
        // Responde 200 para a Appmax nao ficar reenviando um pedido que nao e nosso.
        return res.json({ received: true, ignored: 'pagamento nao encontrado' });
      }

      if (pagamento.status === 'PAGO') {
        return res.json({ received: true, status: 'PAGO' });
      }

      if (!appmax.eventoConfirmaPagamento(evento)) {
        return res.json({ received: true, ignored: `evento ${evento}` });
      }

      await confirmarPagamento(pagamento);

      return res.json({ received: true, status: 'PAGO' });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Erro ao processar webhook.' });
    }
  }
};
