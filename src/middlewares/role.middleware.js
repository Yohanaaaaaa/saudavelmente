/**
 * Restringe uma rota aos tipos de usuario informados.
 * Deve ser usado depois do authMiddleware, que preenche req.user.
 *
 * Ex.: app.post('/reservas/:id/confirmar', requireTipo('PATIENT'), ...)
 */
function requireTipo(...tipos) {
  const permitidos = tipos.flat().map((tipo) => String(tipo).toUpperCase());

  return function roleMiddleware(req, res, next) {
    if (req.method === 'OPTIONS') {
      return next();
    }

    const tipoAtual = String(req.user?.tipo || '').toUpperCase();

    if (!tipoAtual) {
      return res.status(401).json({ message: 'Usuario nao autenticado.' });
    }

    if (!permitidos.includes(tipoAtual)) {
      return res.status(403).json({
        message: `Acesso permitido apenas para: ${permitidos.join(', ')}.`
      });
    }

    return next();
  };
}

module.exports = { requireTipo };
