const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../database');

const router = express.Router();

router.post('/register', (req, res) => {
  const { nome, email, senha, perfil } = req.body;

  if (!nome || !email || !senha || !perfil) {
    return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
  }

  if (!['bibliotecario', 'leitor'].includes(perfil)) {
    return res.status(400).json({ error: 'Perfil inválido.' });
  }

  const existente = db.prepare('SELECT id FROM usuarios WHERE email = ?').get(email);
  if (existente) {
    return res.status(409).json({ error: 'E-mail já cadastrado.' });
  }

  const hash = bcrypt.hashSync(senha, 10);
  const result = db.prepare('INSERT INTO usuarios (nome, email, senha, perfil) VALUES (?, ?, ?, ?)').run(nome, email, hash, perfil);

  res.status(201).json({ message: 'Usuário cadastrado com sucesso.', id: result.lastInsertRowid });
});

router.post('/login', (req, res) => {
  const { email, senha } = req.body;

  if (!email || !senha) {
    return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
  }

  const usuario = db.prepare('SELECT * FROM usuarios WHERE email = ?').get(email);
  if (!usuario) {
    return res.status(401).json({ error: 'E-mail ou senha inválidos.' });
  }

  const senhaValida = bcrypt.compareSync(senha, usuario.senha);
  if (!senhaValida) {
    return res.status(401).json({ error: 'E-mail ou senha inválidos.' });
  }

  req.session.userId = usuario.id;
  req.session.nome = usuario.nome;
  req.session.perfil = usuario.perfil;

  res.json({ message: 'Login realizado com sucesso.', perfil: usuario.perfil, nome: usuario.nome });
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ message: 'Logout realizado com sucesso.' });
  });
});

router.get('/me', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Não autenticado.' });
  }
  res.json({ id: req.session.userId, nome: req.session.nome, perfil: req.session.perfil });
});

module.exports = router;
