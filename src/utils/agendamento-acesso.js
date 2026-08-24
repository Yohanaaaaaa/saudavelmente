/**
 * Regras de acesso a um agendamento: paciente dono, psicologo dono ou admin.
 */
async function carregarAgendamentoDoUsuario(prisma, req, appointmentId, include) {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: include || { patient: true, therapist: true, payment: true }
  });

  if (!appointment) {
    return { erro: { status: 404, message: 'Agendamento nao encontrado.' } };
  }

  const tipo = String(req.user?.tipo || '').toUpperCase();
  const usuarioId = Number(req.user?.id);

  const ehDono =
    (tipo === 'PATIENT' && appointment.patientId === usuarioId) ||
    (tipo === 'THERAPIST' && appointment.therapistId === usuarioId) ||
    tipo === 'ADMIN';

  if (!ehDono) {
    return {
      erro: { status: 403, message: 'Esse agendamento nao pertence a voce.' }
    };
  }

  return { appointment, tipo };
}

function horasDeAntecedencia() {
  const parsed = Number(process.env.CANCELAMENTO_ANTECEDENCIA_HORAS);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 24;
}

/**
 * O paciente so remarca ou cancela respeitando a antecedencia minima.
 * Psicologo e admin nao ficam presos a essa regra.
 */
function podeAlterar(appointment, tipo) {
  if (tipo !== 'PATIENT') return { permitido: true };

  const limite = new Date(
    appointment.horario_atendimento.getTime() - horasDeAntecedencia() * 3600000
  );

  if (new Date() > limite) {
    return {
      permitido: false,
      message: `Alteracoes so ate ${horasDeAntecedencia()}h antes da consulta. Fale com o suporte.`
    };
  }

  return { permitido: true };
}

module.exports = {
  carregarAgendamentoDoUsuario,
  horasDeAntecedencia,
  podeAlterar
};
