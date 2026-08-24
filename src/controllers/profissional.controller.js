const { PrismaClient } = require('@prisma/client');
const {
  parsePagination,
  buildPaginatedResponse
} = require('../utils/pagination');
const { normalizeDate, addDays, timeToMinutes } = require('../utils/agenda');
const { serializeAppointments } = require('../utils/appointment-status');
const { slugify } = require('../utils/therapist-publico');

const prisma = new PrismaClient();

const STATUS_ATIVOS = ['PENDENTE', 'AGUARDANDO_PAGAMENTO', 'APROVADO', 'CONFIRMADO'];

const CAMPOS_EDITAVEIS = [
  'nomeCompleto',
  'celular',
  'fotoUrl',
  'bio',
  'formacao',
  'abordagem_e_experiencia',
  'experienciaAnos',
  'valorConsulta',
  'duracaoConsulta',
  'cidade',
  'estado',
  'pix',
  'horarioDisponivel'
];

const CAMPOS_LISTA = ['especialidades', 'idiomas', 'modalidades'];

function hojeUtc() {
  const agora = new Date();
  return new Date(
    Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), agora.getUTCDate())
  );
}

function serializeTherapistPrivado(therapist) {
  const { senha, ...resto } = therapist;
  return resto;
}

async function gerarSlugUnico(nome, therapistId) {
  const base = slugify(nome) || `psicologo-${therapistId}`;
  let candidato = base;
  let sufixo = 1;

  // Evita colisao quando dois profissionais tem o mesmo nome.
  while (true) {
    const existente = await prisma.therapist.findUnique({
      where: { slug: candidato },
      select: { id: true }
    });

    if (!existente || existente.id === therapistId) return candidato;

    sufixo += 1;
    candidato = `${base}-${sufixo}`;
  }
}

function normalizarLista(valor) {
  if (Array.isArray(valor)) {
    return valor.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof valor === 'string') {
    return valor.split(',').map((item) => item.trim()).filter(Boolean);
  }

  return null;
}

module.exports = {
  /**
   * Painel do psicologo (card P1 - Painel do Psicologo).
   */
  async painel(req, res) {
    const therapistId = Number(req.user.id);

    try {
      const hoje = hojeUtc();
      const amanha = addDays(hoje, 1);
      const inicioDoMes = new Date(
        Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), 1)
      );

      const [
        consultasDeHoje,
        proximas,
        realizadasNoMes,
        canceladasNoMes,
        naoLidas,
        aReceber,
        recebidoNoMes,
        therapist
      ] = await Promise.all([
        prisma.appointment.findMany({
          where: {
            therapistId,
            status: { in: STATUS_ATIVOS },
            horario_atendimento: { gte: hoje, lt: amanha }
          },
          include: { patient: true },
          orderBy: { horario_atendimento: 'asc' }
        }),
        prisma.appointment.findMany({
          where: {
            therapistId,
            status: { in: STATUS_ATIVOS },
            horario_atendimento: { gte: new Date() }
          },
          include: { patient: true },
          orderBy: { horario_atendimento: 'asc' },
          take: 5
        }),
        prisma.appointment.count({
          where: {
            therapistId,
            status: 'REALIZADO',
            horario_atendimento: { gte: inicioDoMes }
          }
        }),
        prisma.appointment.count({
          where: {
            therapistId,
            status: 'CANCELADO',
            horario_atendimento: { gte: inicioDoMes }
          }
        }),
        prisma.notification.count({
          where: {
            destinatarioTipo: 'THERAPIST',
            destinatarioId: therapistId,
            lida: false
          }
        }),
        prisma.payout.aggregate({
          where: { therapistId, status: 'PENDENTE' },
          _sum: { valor: true }
        }),
        prisma.payout.aggregate({
          where: {
            therapistId,
            status: 'PAGO',
            pagoEm: { gte: inicioDoMes }
          },
          _sum: { valor: true }
        }),
        prisma.therapist.findUnique({ where: { id: therapistId } })
      ]);

      return res.json({
        psicologo: {
          id: therapistId,
          nome: therapist?.nomeCompleto,
          statusCadastro: therapist?.statusCadastro,
          perfilCompleto: Boolean(
            therapist?.bio && therapist?.valorConsulta && therapist?.especialidades?.length
          )
        },
        agendaDoDia: serializeAppointments(consultasDeHoje),
        proximasConsultas: serializeAppointments(proximas),
        resumo: {
          consultasHoje: consultasDeHoje.length,
          realizadasNoMes,
          canceladasNoMes,
          notificacoesNaoLidas: naoLidas
        },
        financeiro: {
          aReceber: aReceber._sum.valor || 0,
          recebidoNoMes: recebidoNoMes._sum.valor || 0
        }
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Erro ao carregar painel.' });
    }
  },

  /**
   * Meu perfil profissional (card P1 - Meu Perfil Profissional).
   */
  async meuPerfil(req, res) {
    try {
      const therapist = await prisma.therapist.findUnique({
        where: { id: Number(req.user.id) }
      });

      if (!therapist) {
        return res.status(404).json({ message: 'Psicologo nao encontrado.' });
      }

      return res.json(serializeTherapistPrivado(therapist));
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Erro ao carregar perfil.' });
    }
  },

  async atualizarPerfil(req, res) {
    const therapistId = Number(req.user.id);

    try {
      const atual = await prisma.therapist.findUnique({
        where: { id: therapistId }
      });

      if (!atual) {
        return res.status(404).json({ message: 'Psicologo nao encontrado.' });
      }

      const data = {};

      for (const campo of CAMPOS_EDITAVEIS) {
        if (req.body[campo] === undefined) continue;

        if (['experienciaAnos', 'valorConsulta', 'duracaoConsulta'].includes(campo)) {
          const numero = Number(req.body[campo]);
          if (!Number.isFinite(numero) || numero < 0) {
            return res.status(400).json({ message: `${campo} deve ser um numero valido.` });
          }
          data[campo] = campo === 'valorConsulta' ? numero : Math.trunc(numero);
          continue;
        }

        data[campo] = req.body[campo];
      }

      for (const campo of CAMPOS_LISTA) {
        const lista = normalizarLista(req.body[campo]);
        if (lista === null) continue;

        if (campo === 'modalidades') {
          const invalidas = lista.filter(
            (item) => !['ONLINE', 'PRESENCIAL'].includes(item.toUpperCase())
          );

          if (invalidas.length > 0) {
            return res.status(400).json({
              message: `Modalidade invalida: ${invalidas.join(', ')}. Use ONLINE ou PRESENCIAL.`
            });
          }

          data.modalidades = lista.map((item) => item.toUpperCase());
          continue;
        }

        data[campo] = lista;
      }

      if (data.duracaoConsulta !== undefined && data.duracaoConsulta < 10) {
        return res.status(400).json({
          message: 'A duracao da consulta deve ser de pelo menos 10 minutos.'
        });
      }

      // CRP alterado volta para a fila de verificacao.
      if (req.body.numero_registro && req.body.numero_registro !== atual.numero_registro) {
        data.numero_registro = req.body.numero_registro;
        data.verificacao_registro = false;
      }

      if (req.body.slug || data.nomeCompleto || !atual.slug) {
        data.slug = await gerarSlugUnico(
          req.body.slug || data.nomeCompleto || atual.nomeCompleto,
          therapistId
        );
      }

      const atualizado = await prisma.therapist.update({
        where: { id: therapistId },
        data
      });

      return res.json({
        message: 'Perfil atualizado. As mudancas ja aparecem no catalogo.',
        perfil: serializeTherapistPrivado(atualizado)
      });
    } catch (error) {
      if (error.code === 'P2002') {
        return res.status(409).json({ message: 'Ja existe perfil com esse slug ou e-mail.' });
      }

      console.error(error);
      return res.status(500).json({ message: 'Erro ao atualizar perfil.' });
    }
  },

  /**
   * Agenda do psicologo (card P1 - Gestao da Agenda do Psicologo).
   */
  async minhaAgenda(req, res) {
    const therapistId = Number(req.user.id);

    try {
      const inicio = req.query.de ? normalizeDate(req.query.de) : hojeUtc();
      if (!inicio) {
        return res.status(400).json({ message: 'Parametro de invalido (YYYY-MM-DD).' });
      }

      const fimBase = req.query.ate ? normalizeDate(req.query.ate) : addDays(inicio, 30);
      if (!fimBase) {
        return res.status(400).json({ message: 'Parametro ate invalido (YYYY-MM-DD).' });
      }

      const fim = addDays(fimBase, 1);

      const [blocos, agendamentos] = await Promise.all([
        prisma.therapistAvailability.findMany({
          where: { therapistId, date: { gte: inicio, lt: fim } },
          orderBy: [{ date: 'asc' }, { startTime: 'asc' }]
        }),
        prisma.appointment.findMany({
          where: {
            therapistId,
            status: { in: STATUS_ATIVOS },
            horario_atendimento: { gte: inicio, lt: fim }
          },
          select: { id: true, horario_atendimento: true, availabilityId: true }
        })
      ]);

      const ocupacaoPorBloco = new Map();
      for (const agendamento of agendamentos) {
        const chave = agendamento.availabilityId;
        if (!chave) continue;
        ocupacaoPorBloco.set(chave, (ocupacaoPorBloco.get(chave) || 0) + 1);
      }

      return res.json({
        de: inicio.toISOString().slice(0, 10),
        ate: fimBase.toISOString().slice(0, 10),
        blocos: blocos.map((bloco) => ({
          id: bloco.id,
          date: bloco.date.toISOString().slice(0, 10),
          startTime: bloco.startTime,
          endTime: bloco.endTime,
          isAvailable: bloco.isAvailable,
          consultasMarcadas: ocupacaoPorBloco.get(bloco.id) || 0
        }))
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Erro ao carregar agenda.' });
    }
  },

  /**
   * Cria blocos repetindo um padrao semanal dentro de um periodo.
   */
  async criarRecorrencia(req, res) {
    const therapistId = Number(req.user.id);

    try {
      const inicio = normalizeDate(req.body?.de);
      const fim = normalizeDate(req.body?.ate);

      if (!inicio || !fim || fim < inicio) {
        return res.status(400).json({
          message: 'Informe de e ate no formato YYYY-MM-DD, com ate maior ou igual a de.'
        });
      }

      if ((fim - inicio) / 86400000 > 180) {
        return res.status(400).json({ message: 'O periodo maximo e de 180 dias.' });
      }

      const dias = Array.isArray(req.body?.dias) ? req.body.dias : [];
      if (dias.length === 0) {
        return res.status(400).json({
          message: 'Informe ao menos um item em dias: { diaSemana, startTime, endTime }.'
        });
      }

      for (const dia of dias) {
        const diaSemana = Number(dia?.diaSemana);
        const inicioMin = timeToMinutes(dia?.startTime);
        const fimMin = timeToMinutes(dia?.endTime);

        if (!Number.isInteger(diaSemana) || diaSemana < 0 || diaSemana > 6) {
          return res.status(400).json({
            message: 'diaSemana deve ser um numero de 0 (domingo) a 6 (sabado).'
          });
        }

        if (inicioMin === null || fimMin === null || fimMin <= inicioMin) {
          return res.status(400).json({
            message: 'startTime e endTime devem estar no formato HH:MM, com fim depois do inicio.'
          });
        }
      }

      const registros = [];

      for (let cursor = new Date(inicio); cursor <= fim; cursor = addDays(cursor, 1)) {
        for (const dia of dias) {
          if (Number(dia.diaSemana) !== cursor.getUTCDay()) continue;

          registros.push({
            therapistId,
            date: new Date(cursor),
            startTime: dia.startTime,
            endTime: dia.endTime,
            isAvailable: dia.isAvailable === undefined ? true : Boolean(dia.isAvailable)
          });
        }
      }

      if (registros.length === 0) {
        return res.status(400).json({
          message: 'Nenhuma data no periodo bate com os dias informados.'
        });
      }

      const criados = await prisma.therapistAvailability.createMany({
        data: registros,
        skipDuplicates: true
      });

      return res.status(201).json({
        message: 'Agenda gerada.',
        blocosCriados: criados.count,
        blocosIgnorados: registros.length - criados.count
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Erro ao gerar agenda.' });
    }
  },

  /**
   * Bloqueia ou libera um bloco. Bloco com consulta marcada nao pode ser
   * bloqueado nem apagado.
   */
  async alternarDisponibilidade(req, res) {
    const therapistId = Number(req.user.id);
    const availabilityId = Number(req.params.id);

    if (!Number.isInteger(availabilityId) || availabilityId <= 0) {
      return res.status(400).json({ message: 'id invalido.' });
    }

    try {
      const bloco = await prisma.therapistAvailability.findUnique({
        where: { id: availabilityId }
      });

      if (!bloco || bloco.therapistId !== therapistId) {
        return res.status(404).json({ message: 'Bloco de agenda nao encontrado.' });
      }

      const desejado = req.body?.isAvailable;
      const novoValor = desejado === undefined ? !bloco.isAvailable : Boolean(desejado);

      if (!novoValor) {
        const marcadas = await prisma.appointment.count({
          where: {
            availabilityId: bloco.id,
            status: { in: STATUS_ATIVOS }
          }
        });

        if (marcadas > 0) {
          return res.status(409).json({
            message: `Esse bloco tem ${marcadas} consulta(s) marcada(s). Cancele ou remarque antes de bloquear.`
          });
        }
      }

      const atualizado = await prisma.therapistAvailability.update({
        where: { id: bloco.id },
        data: { isAvailable: novoValor }
      });

      return res.json({
        message: novoValor ? 'Bloco liberado.' : 'Bloco bloqueado.',
        bloco: {
          id: atualizado.id,
          date: atualizado.date.toISOString().slice(0, 10),
          startTime: atualizado.startTime,
          endTime: atualizado.endTime,
          isAvailable: atualizado.isAvailable
        }
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Erro ao atualizar bloco.' });
    }
  },

  /**
   * Historico de consultas (card P1 - Historico de Consultas).
   */
  async minhasConsultas(req, res) {
    const therapistId = Number(req.user.id);

    try {
      const { page, pageSize, skip, take } = parsePagination(req.query, {
        defaultPageSize: 10
      });

      const where = { therapistId };

      if (req.query.status) {
        const status = String(req.query.status)
          .split(',')
          .map((item) => item.trim().toUpperCase())
          .filter(Boolean);

        if (status.length > 0) where.status = { in: status };
      }

      const de = req.query.de ? normalizeDate(req.query.de) : null;
      const ate = req.query.ate ? normalizeDate(req.query.ate) : null;

      if (de || ate) {
        where.horario_atendimento = {};
        if (de) where.horario_atendimento.gte = de;
        if (ate) where.horario_atendimento.lt = addDays(ate, 1);
      }

      if (req.query.periodo === 'futuras') {
        where.horario_atendimento = { gte: new Date() };
      }

      if (req.query.periodo === 'passadas') {
        where.horario_atendimento = { lt: new Date() };
      }

      const [total, consultas] = await prisma.$transaction([
        prisma.appointment.count({ where }),
        prisma.appointment.findMany({
          where,
          include: { patient: true, payment: true },
          orderBy: { horario_atendimento: 'desc' },
          skip,
          take
        })
      ]);

      return res.json(
        buildPaginatedResponse(serializeAppointments(consultas), total, page, pageSize)
      );
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Erro ao listar consultas.' });
    }
  },

  /**
   * Marca a consulta como realizada ou como falta do paciente.
   */
  async registrarPresenca(req, res) {
    const therapistId = Number(req.user.id);
    const appointmentId = Number(req.params.id);

    if (!Number.isInteger(appointmentId) || appointmentId <= 0) {
      return res.status(400).json({ message: 'id invalido.' });
    }

    const situacao = String(req.body?.situacao || '').toUpperCase();
    if (!['REALIZADO', 'FALTA'].includes(situacao)) {
      return res.status(400).json({
        message: 'Informe situacao: REALIZADO ou FALTA.'
      });
    }

    try {
      const agendamento = await prisma.appointment.findUnique({
        where: { id: appointmentId }
      });

      if (!agendamento || agendamento.therapistId !== therapistId) {
        return res.status(404).json({ message: 'Agendamento nao encontrado.' });
      }

      if (!['APROVADO', 'CONFIRMADO'].includes(agendamento.status)) {
        return res.status(409).json({
          message: `Agendamento com status ${agendamento.status} nao pode receber presenca.`
        });
      }

      const atualizado = await prisma.appointment.update({
        where: { id: agendamento.id },
        data: {
          status: situacao,
          realizadoEm: situacao === 'REALIZADO' ? new Date() : null
        },
        include: { patient: true }
      });

      return res.json({
        message: situacao === 'REALIZADO' ? 'Consulta marcada como realizada.' : 'Falta registrada.',
        agendamento: serializeAppointments([atualizado])[0]
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Erro ao registrar presenca.' });
    }
  },

  /**
   * Gestao financeira (card P1 - Gestao Financeira do Psicologo).
   */
  async financeiro(req, res) {
    const therapistId = Number(req.user.id);

    try {
      const { page, pageSize, skip, take } = parsePagination(req.query, {
        defaultPageSize: 20
      });

      const where = { therapistId };

      const de = req.query.de ? normalizeDate(req.query.de) : null;
      const ate = req.query.ate ? normalizeDate(req.query.ate) : null;

      if (de || ate) {
        where.createdAt = {};
        if (de) where.createdAt.gte = de;
        if (ate) where.createdAt.lt = addDays(ate, 1);
      }

      if (req.query.status) {
        where.status = String(req.query.status).toUpperCase();
      }

      const [total, repasses, somaPendente, somaPaga] = await prisma.$transaction([
        prisma.payout.count({ where }),
        prisma.payout.findMany({
          where,
          include: {
            payment: {
              include: {
                appointment: { include: { patient: true } }
              }
            }
          },
          orderBy: { previsaoData: 'asc' },
          skip,
          take
        }),
        prisma.payout.aggregate({
          where: { ...where, status: 'PENDENTE' },
          _sum: { valor: true }
        }),
        prisma.payout.aggregate({
          where: { ...where, status: 'PAGO' },
          _sum: { valor: true }
        })
      ]);

      const dados = repasses.map((repasse) => ({
        id: repasse.id,
        status: repasse.status,
        valor: repasse.valor,
        previsaoData: repasse.previsaoData.toISOString().slice(0, 10),
        pagoEm: repasse.pagoEm ? repasse.pagoEm.toISOString() : null,
        observacao: repasse.observacao,
        consulta: repasse.payment?.appointment
          ? {
              id: repasse.payment.appointment.id,
              data: repasse.payment.appointment.data_atendimento,
              horario: repasse.payment.appointment.horario_atendimento.toISOString(),
              status: repasse.payment.appointment.status,
              paciente: repasse.payment.appointment.patient?.nomeCompleto
            }
          : null,
        pagamento: repasse.payment
          ? {
              valorConsulta: repasse.payment.valor,
              taxaPlataforma: repasse.payment.taxaPlataforma,
              status: repasse.payment.status
            }
          : null
      }));

      return res.json({
        totais: {
          aReceber: somaPendente._sum.valor || 0,
          recebido: somaPaga._sum.valor || 0
        },
        ...buildPaginatedResponse(dados, total, page, pageSize)
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Erro ao carregar financeiro.' });
    }
  }
};
