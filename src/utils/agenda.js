const DEFAULT_DURACAO_MINUTOS = 50;

const STATUS_QUE_OCUPAM_HORARIO = [
  'PENDENTE',
  'AGUARDANDO_PAGAMENTO',
  'APROVADO',
  'CONFIRMADO'
];

function parseId(id) {
  const numericId = Number(id);
  return Number.isInteger(numericId) && numericId > 0 ? numericId : null;
}

function toDateOnly(value) {
  if (!value) return null;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;

  return parsed.toISOString().slice(0, 10);
}

function normalizeDate(dateValue) {
  if (!dateValue) return null;

  const parsed = new Date(`${dateValue}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return null;

  return parsed;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

/**
 * Converte "09:30" em 570 minutos. Retorna null para formatos invalidos.
 */
function timeToMinutes(time) {
  if (typeof time !== 'string') return null;

  const match = time.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (hours > 23 || minutes > 59) return null;

  return hours * 60 + minutes;
}

function minutesToTime(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/**
 * A agenda usa a mesma convencao ja adotada no projeto: a data e gravada em
 * UTC (meia-noite) e o horario vem como texto "HH:MM". O slot final combina os
 * dois em um DateTime UTC.
 */
function buildSlotDate(dateOnly, time) {
  const slotDate = new Date(`${dateOnly}T${time}:00.000Z`);
  return Number.isNaN(slotDate.getTime()) ? null : slotDate;
}

function getAntecedenciaMinima() {
  const parsed = Number(process.env.AGENDAMENTO_ANTECEDENCIA_MINUTOS);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 60;
}

/**
 * Quebra os blocos de disponibilidade em slots do tamanho da consulta,
 * removendo o que ja esta ocupado e o que esta fora da antecedencia minima.
 *
 * @param {object} params
 * @param {Array} params.availabilities blocos vindos de TherapistAvailability
 * @param {number} params.duracaoMinutos duracao da consulta do profissional
 * @param {Set<string>} params.ocupados horarios ocupados em ISO string
 * @param {Date} [params.agora] usado para descartar horarios passados
 */
function gerarSlots({ availabilities = [], duracaoMinutos, ocupados = new Set(), agora = new Date() }) {
  const duracao = Number(duracaoMinutos) > 0
    ? Number(duracaoMinutos)
    : DEFAULT_DURACAO_MINUTOS;

  const limiteInferior = new Date(agora.getTime() + getAntecedenciaMinima() * 60000);
  const porDia = new Map();

  for (const availability of availabilities) {
    if (availability.isAvailable === false) continue;

    const dateOnly = availability.date.toISOString().slice(0, 10);
    const inicio = timeToMinutes(availability.startTime);
    const fim = timeToMinutes(availability.endTime);

    if (inicio === null || fim === null || fim <= inicio) continue;

    for (let cursor = inicio; cursor + duracao <= fim; cursor += duracao) {
      const horaInicio = minutesToTime(cursor);
      const horaFim = minutesToTime(cursor + duracao);
      const slotDate = buildSlotDate(dateOnly, horaInicio);

      if (!slotDate) continue;
      if (slotDate < limiteInferior) continue;
      if (ocupados.has(slotDate.toISOString())) continue;

      if (!porDia.has(dateOnly)) {
        porDia.set(dateOnly, { date: dateOnly, slots: [], vistos: new Set() });
      }

      const dia = porDia.get(dateOnly);
      const chave = slotDate.toISOString();
      if (dia.vistos.has(chave)) continue;

      dia.vistos.add(chave);
      dia.slots.push({
        inicio: horaInicio,
        fim: horaFim,
        horario: chave,
        availabilityId: availability.id,
        duracaoMinutos: duracao
      });
    }
  }

  return Array.from(porDia.values())
    .map(({ date, slots }) => ({
      date,
      slots: slots.sort((a, b) => a.inicio.localeCompare(b.inicio))
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Monta o conjunto de horarios ja tomados por agendamentos e reservas ativas.
 */
async function carregarOcupados(prisma, { therapistId, inicio, fim, ignorarReservaId }) {
  const [appointments, reservas] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        therapistId,
        horario_atendimento: { gte: inicio, lt: fim },
        status: { in: STATUS_QUE_OCUPAM_HORARIO }
      },
      select: { horario_atendimento: true }
    }),
    prisma.reserva.findMany({
      where: {
        therapistId,
        horario_atendimento: { gte: inicio, lt: fim },
        status: 'ATIVA',
        expiresAt: { gt: new Date() },
        ...(ignorarReservaId ? { id: { not: ignorarReservaId } } : {})
      },
      select: { horario_atendimento: true }
    })
  ]);

  const ocupados = new Set();

  for (const item of appointments) {
    ocupados.add(item.horario_atendimento.toISOString());
  }

  for (const item of reservas) {
    ocupados.add(item.horario_atendimento.toISOString());
  }

  return ocupados;
}

/**
 * Confere se o horario pedido existe dentro de algum bloco de disponibilidade
 * do profissional. Retorna o bloco correspondente ou null.
 */
function encontrarBlocoDoHorario(availabilities, slotDate, duracaoMinutos) {
  const dateOnly = slotDate.toISOString().slice(0, 10);
  const minutosSlot = slotDate.getUTCHours() * 60 + slotDate.getUTCMinutes();

  return availabilities.find((availability) => {
    if (availability.isAvailable === false) return false;
    if (availability.date.toISOString().slice(0, 10) !== dateOnly) return false;

    const inicio = timeToMinutes(availability.startTime);
    const fim = timeToMinutes(availability.endTime);
    if (inicio === null || fim === null) return false;

    const alinhado = (minutosSlot - inicio) % duracaoMinutos === 0;

    return alinhado && minutosSlot >= inicio && minutosSlot + duracaoMinutos <= fim;
  }) || null;
}

module.exports = {
  DEFAULT_DURACAO_MINUTOS,
  STATUS_QUE_OCUPAM_HORARIO,
  addDays,
  buildSlotDate,
  carregarOcupados,
  encontrarBlocoDoHorario,
  gerarSlots,
  getAntecedenciaMinima,
  minutesToTime,
  normalizeDate,
  parseId,
  timeToMinutes,
  toDateOnly
};
