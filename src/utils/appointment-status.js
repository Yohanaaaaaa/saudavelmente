const APPOINTMENT_STATUS = Object.freeze({
  PENDENTE: {
    code: 'PENDENTE',
    description: 'Solicitacao aguardando analise do profissional.'
  },
  APROVADO: {
    code: 'APROVADO',
    description: 'Solicitacao aprovada.'
  },
  RECUSADO: {
    code: 'RECUSADO',
    description: 'Solicitacao recusada.'
  },
  CANCELADO: {
    code: 'CANCELADO',
    description: 'Agendamento cancelado.'
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
