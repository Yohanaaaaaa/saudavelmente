/**
 * Libera horarios presos por reservas ou pagamentos que passaram do prazo.
 * E chamado nas rotas do fluxo de agendamento para que o horario volte a
 * aparecer para outros pacientes sem depender de um job externo.
 */
async function liberarHorariosExpirados(prisma) {
  const agora = new Date();

  try {
    await prisma.$transaction([
      prisma.reserva.updateMany({
        where: { status: 'ATIVA', expiresAt: { lt: agora } },
        data: { status: 'EXPIRADA' }
      }),
      prisma.appointment.updateMany({
        where: {
          status: 'AGUARDANDO_PAGAMENTO',
          expiresAt: { lt: agora }
        },
        data: { status: 'CANCELADO' }
      })
    ]);
  } catch (error) {
    // Nao pode derrubar a request principal.
    console.error('Falha ao expirar reservas/agendamentos:', error);
  }
}

function minutosDeReserva() {
  const parsed = Number(process.env.RESERVA_MINUTOS);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 15;
}

function minutosDePagamento() {
  const parsed = Number(process.env.PAGAMENTO_MINUTOS);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 30;
}

module.exports = {
  liberarHorariosExpirados,
  minutosDePagamento,
  minutosDeReserva
};
