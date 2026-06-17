function requireLogin(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Acesso não autorizado. Faça login.' });
  }
  next();
}

function requireBibliotecario(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Acesso não autorizado. Faça login.' });
  }
  if (req.session.perfil !== 'bibliotecario') {
    return res.status(403).json({ error: 'Acesso restrito a bibliotecários.' });
  }
  next();
}

function requireLeitor(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Acesso não autorizado. Faça login.' });
  }
  if (req.session.perfil !== 'leitor') {
    return res.status(403).json({ error: 'Acesso restrito a leitores.' });
  }
  next();
}

module.exports = { requireLogin, requireBibliotecario, requireLeitor };
