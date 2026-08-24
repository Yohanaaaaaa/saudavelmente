const APPOINTMENT_STATUS = Object.freeze({
  PENDENTE: {
    code: 'PENDENTE',
    description: 'Solicitacao aguardando analise do profissional.'
  },
  AGUARDANDO_PAGAMENTO: {
    code: 'AGUARDANDO_PAGAMENTO',
    description: 'Horario reservado, aguardando o pagamento do paciente.'
  },
  APROVADO: {
    code: 'APROVADO',
    description: 'Solicitacao aprovada.'
  },
  CONFIRMADO: {
    code: 'CONFIRMADO',
    description: 'Pagamento confirmado e consulta agendada.'
  },
  RECUSADO: {
    code: 'RECUSADO',
    description: 'Solicitacao recusada.'
  },
  CANCELADO: {
    code: 'CANCELADO',
    description: 'Agendamento cancelado.'
  },
  REMARCADO: {
    code: 'REMARCADO',
    description: 'Agendamento remarcado para outra data.'
  },
  REALIZADO: {
    code: 'REALIZADO',
    description: 'Consulta realizada.'
  },
  FALTA: {
    code: 'FALTA',
    description: 'Paciente nao compareceu.'
  }
});

function toAppointmentStatus(code) {
  return APPOINTMENT_STATUS[code] || {
    code,
    description: 'Status nao mapeado.'
  };
}

function serializeAppointment(appointment) {
  if (!appointment) return appointment;

  return {
    ...appointment,
    status: toAppointmentStatus(appointment.status)
  };
}

function serializeAppointments(appointments = []) {
  return appointments.map(serializeAppointment);
}

module.exports = {
  APPOINTMENT_STATUS,
  toAppointmentStatus,
  serializeAppointment,
  serializeAppointments
};
