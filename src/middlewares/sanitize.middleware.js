/**
 * Rede de seguranca: nenhuma resposta da API pode carregar hash de senha ou
 * token de recuperacao, venha de onde vier.
 *
 * As tabelas Patient e Therapist ganharam a coluna senha, e varias rotas
 * devolvem o registro inteiro do Prisma. Em vez de lembrar de limpar em cada
 * controller, a limpeza acontece uma vez so, na saida.
 */
const CAMPOS_PROIBIDOS = new Set(['senha', 'senhaHash', 'tokenHash']);

const PROFUNDIDADE_MAXIMA = 12;

function ehObjetoSimples(valor) {
  if (valor === null || typeof valor !== 'object') return false;

  // Date, Buffer, Decimal e afins precisam passar intactos para nao virar {}.
  const prototipo = Object.getPrototypeOf(valor);
  return prototipo === Object.prototype || prototipo === null;
}

function limpar(valor, profundidade = 0) {
  if (profundidade > PROFUNDIDADE_MAXIMA) return valor;

  if (Array.isArray(valor)) {
    return valor.map((item) => limpar(item, profundidade + 1));
  }

  if (!ehObjetoSimples(valor)) return valor;

  const copia = {};
  for (const [chave, item] of Object.entries(valor)) {
    if (CAMPOS_PROIBIDOS.has(chave)) continue;
    copia[chave] = limpar(item, profundidade + 1);
  }

  return copia;
}

module.exports = function sanitizeResponse(req, res, next) {
  const jsonOriginal = res.json.bind(res);

  res.json = (corpo) => jsonOriginal(limpar(corpo));

  return next();
};

module.exports.limpar = limpar;
