const { PrismaClient } = require('@prisma/client');
const {
  parsePagination,
  buildPaginatedResponse
} = require('../utils/pagination');
const {
  CATALOGO_FILTRO_BASE,
  THERAPIST_PUBLIC_SELECT,
  buildTherapistWhere,
  serializeTherapistPublico
} = require('../utils/therapist-publico');
const {
  addDays,
  carregarOcupados,
  gerarSlots,
  normalizeDate
} = require('../utils/agenda');

const prisma = new PrismaClient();

const MAX_DIAS_AGENDA = 60;
const DIAS_AGENDA_PERFIL = 14;

function hojeUtc() {
  const agora = new Date();
  return new Date(
    Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), agora.getUTCDate())
  );
}

function parseNumero(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function buildOrderBy(ordenar) {
  switch (ordenar) {
    case 'preco':
      return [{ valorConsulta: 'asc' }, { id: 'asc' }];
    case 'preco_desc':
      return [{ valorConsulta: 'desc' }, { id: 'asc' }];
    case 'recentes':
      return [{ createdAt: 'desc' }];
    default:
      return [{ nomeCompleto: 'asc' }];
  }
}

function buildFiltros(query) {
  const where = { ...CATALOGO_FILTRO_BASE };

  const busca = String(query.busca || '').trim();
  if (busca) {
    where.OR = [
      { nomeCompleto: { contains: busca, mode: 'insensitive' } },
      { bio: { contains: busca, mode: 'insensitive' } },
      { formacao: { contains: busca, mode: 'insensitive' } },
      { abordagem_e_experiencia: { contains: busca, mode: 'insensitive' } },
      { especialidades: { has: busca } }
    ];
  }

  if (query.especialidade) {
    where.especialidades = { has: String(query.especialidade) };
  }

  if (query.modalidade) {
    where.modalidades = { has: String(query.modalidade).toUpperCase() };
  }

  const precoMin = parseNumero(query.precoMin);
  const precoMax = parseNumero(query.precoMax);

  if (precoMin !== null || precoMax !== null) {
    where.valorConsulta = {};
    if (precoMin !== null) where.valorConsulta.gte = precoMin;
    if (precoMax !== null) where.valorConsulta.lte = precoMax;
  }

  return where;
}

/**
 * Carrega os dias com horarios livres de um profissional dentro do periodo.
 */
async function montarAgenda(therapist, inicio, fim) {
  const availabilities = await prisma.therapistAvailability.findMany({
    where: {
      therapistId: therapist.id,
      isAvailable: true,
      date: { gte: inicio, lt: fim }
    },
    orderBy: [{ date: 'asc' }, { startTime: 'asc' }]
  });

  if (availabilities.length === 0) return [];

  const ocupados = await carregarOcupados(prisma, {
    therapistId: therapist.id,
    inicio,
    fim
  });

  return gerarSlots({
    availabilities,
    duracaoMinutos: therapist.duracaoConsulta,
    ocupados
  });
}

module.exports = {
  /**
   * Catalogo publico de psicologos (card P0 - Catalogo de Psicologos).
   */
  async listar(req, res) {
    try {
      const { page, pageSize, skip, take } = parsePagination(req.query, {
        defaultPageSize: 12,
        maxPageSize: 50
      });

      const where = buildFiltros(req.query);

      const [total, therapists] = await prisma.$transaction([
        prisma.therapist.count({ where }),
        prisma.therapist.findMany({
          where,
          select: { ...THERAPIST_PUBLIC_SELECT, createdAt: true },
          orderBy: buildOrderBy(req.query.ordenar),
          skip,
          take
        })
      ]);

      return res.json(
        buildPaginatedResponse(
          therapists.map(serializeTherapistPublico),
          total,
          page,
          pageSize
        )
      );
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Erro ao listar psicologos.' });
    }
  },

  /**
   * Lista as especialidades ja cadastradas, para montar o filtro do catalogo.
   */
  async especialidades(req, res) {
    try {
      const therapists = await prisma.therapist.findMany({
        where: CATALOGO_FILTRO_BASE,
        select: { especialidades: true }
      });

      const unicas = new Set();
      for (const therapist of therapists) {
        for (const especialidade of therapist.especialidades || []) {
          if (especialidade) unicas.add(especialidade);
        }
      }

      return res.json({
        data: Array.from(unicas).sort((a, b) => a.localeCompare(b))
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Erro ao listar especialidades.' });
    }
  },

  /**
   * Perfil completo do psicologo (card P0 - Perfil Completo do Psicologo).
   */
  async perfil(req, res) {
    try {
      const therapist = await prisma.therapist.findFirst({
        where: {
          ...buildTherapistWhere(req.params.idOrSlug),
          ...CATALOGO_FILTRO_BASE
        },
        select: THERAPIST_PUBLIC_SELECT
      });

      if (!therapist) {
        return res.status(404).json({ message: 'Psicologo nao encontrado.' });
      }

      const inicio = hojeUtc();
      const fim = addDays(inicio, DIAS_AGENDA_PERFIL);
      const agenda = await montarAgenda(therapist, inicio, fim);

      return res.json({
        ...serializeTherapistPublico(therapist),
        agenda: {
          de: inicio.toISOString().slice(0, 10),
          ate: fim.toISOString().slice(0, 10),
          dias: agenda
        }
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Erro ao carregar perfil.' });
    }
  },

  /**
   * Horarios livres do psicologo (card P0 - Escolha de Horarios).
   */
  async horarios(req, res) {
    try {
      const therapist = await prisma.therapist.findFirst({
        where: {
          ...buildTherapistWhere(req.params.idOrSlug),
          ...CATALOGO_FILTRO_BASE
        },
        select: { id: true, duracaoConsulta: true, valorConsulta: true }
      });

      if (!therapist) {
        return res.status(404).json({ message: 'Psicologo nao encontrado.' });
      }

      const inicio = req.query.de ? normalizeDate(req.query.de) : hojeUtc();
      if (!inicio) {
        return res.status(400).json({
          message: 'Parametro de invalido. Use o formato YYYY-MM-DD.'
        });
      }

      const fimInformado = req.query.ate ? normalizeDate(req.query.ate) : null;
      if (req.query.ate && !fimInformado) {
        return res.status(400).json({
          message: 'Parametro ate invalido. Use o formato YYYY-MM-DD.'
        });
      }

      const limite = addDays(inicio, MAX_DIAS_AGENDA);
      let fim = fimInformado ? addDays(fimInformado, 1) : addDays(inicio, 30);

      if (fim <= inicio) {
        return res.status(400).json({
          message: 'O parametro ate deve ser maior ou igual ao parametro de.'
        });
      }

      if (fim > limite) fim = limite;

      const dias = await montarAgenda(therapist, inicio, fim);

      return res.json({
        therapistId: therapist.id,
        duracaoConsulta: therapist.duracaoConsulta,
        valorConsulta: therapist.valorConsulta,
        de: inicio.toISOString().slice(0, 10),
        ate: addDays(fim, -1).toISOString().slice(0, 10),
        dias
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Erro ao listar horarios.' });
    }
  }
};
