/**
 * Campos que podem ser exibidos no catalogo e no perfil publico.
 * Dados sensiveis (cpf, pix, email, celular) ficam de fora de proposito.
 */
const THERAPIST_PUBLIC_SELECT = {
  id: true,
  slug: true,
  nomeCompleto: true,
  fotoUrl: true,
  bio: true,
  formacao: true,
  especialidades: true,
  idiomas: true,
  modalidades: true,
  experienciaAnos: true,
  valorConsulta: true,
  duracaoConsulta: true,
  cidade: true,
  estado: true,
  numero_registro: true,
  verificacao_registro: true,
  tipo_atendimento: true,
  abordagem_e_experiencia: true
};

const CATALOGO_FILTRO_BASE = {
  ativo: true,
  statusCadastro: 'APROVADO'
};

function removerAcentos(value) {
  return String(value || '')
    .normalize('NFD')
    .split('')
    .filter((char) => char.charCodeAt(0) < 128)
    .join('');
}

function slugify(value) {
  return removerAcentos(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

function serializeTherapistPublico(therapist) {
  if (!therapist) return therapist;

  return {
    id: therapist.id,
    slug: therapist.slug,
    nome: therapist.nomeCompleto,
    foto: therapist.fotoUrl,
    crp: therapist.numero_registro,
    crpVerificado: therapist.verificacao_registro,
    bio: therapist.bio,
    formacao: therapist.formacao,
    abordagem: therapist.abordagem_e_experiencia,
    especialidades: therapist.especialidades || [],
    idiomas: therapist.idiomas || [],
    modalidades: therapist.modalidades || [],
    experienciaAnos: therapist.experienciaAnos,
    valorConsulta: therapist.valorConsulta,
    duracaoConsulta: therapist.duracaoConsulta,
    cidade: therapist.cidade,
    estado: therapist.estado,
    tipoAtendimento: therapist.tipo_atendimento
  };
}

/**
 * Aceita tanto o id numerico quanto o slug na mesma rota.
 */
function buildTherapistWhere(idOrSlug) {
  const numericId = Number(idOrSlug);

  if (Number.isInteger(numericId) && numericId > 0) {
    return { id: numericId };
  }

  return { slug: String(idOrSlug) };
}

module.exports = {
  CATALOGO_FILTRO_BASE,
  THERAPIST_PUBLIC_SELECT,
  buildTherapistWhere,
  removerAcentos,
  serializeTherapistPublico,
  slugify
};
