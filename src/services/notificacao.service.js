/**
 * Central de notificacoes (card P1 - Central de Notificacoes).
 *
 * Toda notificacao e gravada no banco, que e a fonte da central dentro da
 * plataforma. O envio por e-mail e WhatsApp e feito por webhook: basta apontar
 * EMAIL_WEBHOOK_URL / WHATSAPP_WEBHOOK_URL para o disparador de cada canal.
 * Sem as variaveis configuradas o envio externo e apenas registrado no log.
 */

function formatarDataHora(appointment) {
  if (!appointment?.horario_atendimento) return '';

  const iso = appointment.horario_atendimento.toISOString();
  const [data, hora] = iso.split('T');
  const [ano, mes, dia] = data.split('-');

  return `${dia}/${mes}/${ano} as ${hora.slice(0, 5)}`;
}

function montarResumoConsulta(appointment) {
  return {
    agendamentoId: appointment.id,
    data: appointment.data_atendimento,
    horario: appointment.horario_atendimento.toISOString(),
    dataHoraFormatada: formatarDataHora(appointment),
    duracaoMinutos: appointment.duracaoMinutos,
    modalidade: appointment.modalidade,
    valor: appointment.valor,
    psicologo: appointment.therapist
      ? {
          id: appointment.therapist.id,
          nome: appointment.therapist.nomeCompleto,
          crp: appointment.therapist.numero_registro
        }
      : undefined,
    paciente: appointment.patient
      ? {
          id: appointment.patient.id,
          nome: appointment.patient.nomeCompleto
        }
      : undefined
  };
}

async function dispararWebhook(url, payload) {
  if (!url) return { enviado: false, motivo: 'canal nao configurado' };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.NOTIFICACAO_WEBHOOK_TOKEN
          ? { Authorization: `Bearer ${process.env.NOTIFICACAO_WEBHOOK_TOKEN}` }
          : {})
      },
      body: JSON.stringify(payload)
    });

    return { enviado: response.ok, status: response.status };
  } catch (error) {
    console.error('Falha ao disparar notificacao externa:', error.message);
    return { enviado: false, motivo: error.message };
  }
}

/**
 * Grava a notificacao e tenta os canais externos conforme a preferencia do
 * destinatario. Nunca lanca: notificacao nao pode derrubar a operacao.
 */
async function notificar(prisma, {
  destinatarioTipo,
  destinatarioId,
  tipo,
  titulo,
  mensagem,
  payload,
  appointmentId,
  contato
}) {
  try {
    const notificacao = await prisma.notification.create({
      data: {
        destinatarioTipo,
        destinatarioId,
        tipo,
        titulo,
        mensagem,
        payload: payload || undefined,
        appointmentId: appointmentId || null
      }
    });

    const envelope = {
      notificacaoId: notificacao.id,
      tipo,
      titulo,
      mensagem,
      destinatario: {
        tipo: destinatarioTipo,
        id: destinatarioId,
        nome: contato?.nome,
        email: contato?.email,
        celular: contato?.celular
      },
      payload: payload || null
    };

    if (contato?.email && contato?.notificaEmail !== false) {
      await dispararWebhook(process.env.EMAIL_WEBHOOK_URL, {
        canal: 'email',
        ...envelope
      });
    }

    if (contato?.celular && contato?.notificaWhatsapp !== false) {
      await dispararWebhook(process.env.WHATSAPP_WEBHOOK_URL, {
        canal: 'whatsapp',
        ...envelope
      });
    }

    return notificacao;
  } catch (error) {
    console.error('Falha ao registrar notificacao:', error);
    return null;
  }
}

function contatoDoPaciente(patient) {
  if (!patient) return undefined;

  return {
    nome: patient.nomeCompleto,
    email: patient.email,
    celular: patient.celular,
    notificaEmail: patient.notificaEmail,
    notificaWhatsapp: patient.notificaWhatsapp
  };
}

function contatoDoPsicologo(therapist) {
  if (!therapist) return undefined;

  return {
    nome: therapist.nomeCompleto,
    email: therapist.email,
    celular: therapist.celular,
    notificaEmail: therapist.notificaEmail,
    notificaWhatsapp: therapist.notificaWhatsapp
  };
}

/**
 * Notifica paciente e psicologo sobre um evento do agendamento.
 */
async function notificarAgendamento(prisma, appointment, { tipo, titulo, mensagemPaciente, mensagemPsicologo }) {
  const resumo = montarResumoConsulta(appointment);

  await notificar(prisma, {
    destinatarioTipo: 'PATIENT',
    destinatarioId: appointment.patientId,
    tipo,
    titulo,
    mensagem: mensagemPaciente,
    payload: resumo,
    appointmentId: appointment.id,
    contato: contatoDoPaciente(appointment.patient)
  });

  await notificar(prisma, {
    destinatarioTipo: 'THERAPIST',
    destinatarioId: appointment.therapistId,
    tipo,
    titulo,
    mensagem: mensagemPsicologo || mensagemPaciente,
    payload: resumo,
    appointmentId: appointment.id,
    contato: contatoDoPsicologo(appointment.therapist)
  });
}

module.exports = {
  contatoDoPaciente,
  contatoDoPsicologo,
  formatarDataHora,
  montarResumoConsulta,
  notificar,
  notificarAgendamento
};
