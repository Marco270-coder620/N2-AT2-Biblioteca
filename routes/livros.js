const express = require('express');
const db = require('../database');
const { requireLogin, requireBibliotecario } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireLogin, (req, res) => {
  const livros = db.prepare('SELECT * FROM livros ORDER BY titulo').all();
  res.json(livros);
});

router.get('/:id', requireLogin, (req, res) => {
  const livro = db.prepare('SELECT * FROM livros WHERE id = ?').get(req.params.id);
  if (!livro) {
    return res.status(404).json({ error: 'Livro não encontrado.' });
  }
  res.json(livro);
});

router.post('/', requireBibliotecario, (req, res) => {
  const { titulo, autor, ano_publicacao, quantidade_disponivel } = req.body;

  if (!titulo || !autor || quantidade_disponivel === undefined) {
    return res.status(400).json({ error: 'Título, autor e quantidade são obrigatórios.' });
  }

  if (quantidade_disponivel < 0) {
    return res.status(400).json({ error: 'Quantidade não pode ser negativa.' });
  }

  const result = db.prepare(
    'INSERT INTO livros (titulo, autor, ano_publicacao, quantidade_disponivel) VALUES (?, ?, ?, ?)'
  ).run(titulo, autor, ano_publicacao || null, quantidade_disponivel);

  res.status(201).json({ message: 'Livro cadastrado com sucesso.', id: result.lastInsertRowid });
});

router.put('/:id', requireBibliotecario, (req, res) => {
  const { titulo, autor, ano_publicacao, quantidade_disponivel } = req.body;

  const livro = db.prepare('SELECT * FROM livros WHERE id = ?').get(req.params.id);
  if (!livro) {
    return res.status(404).json({ error: 'Livro não encontrado.' });
  }

  db.prepare(
    'UPDATE livros SET titulo = ?, autor = ?, ano_publicacao = ?, quantidade_disponivel = ? WHERE id = ?'
  ).run(
    titulo || livro.titulo,
    autor || livro.autor,
    ano_publicacao !== undefined ? ano_publicacao : livro.ano_publicacao,
    quantidade_disponivel !== undefined ? quantidade_disponivel : livro.quantidade_disponivel,
    req.params.id
  );

  res.json({ message: 'Livro atualizado com sucesso.' });
});

router.delete('/:id', requireBibliotecario, (req, res) => {
  const livro = db.prepare('SELECT * FROM livros WHERE id = ?').get(req.params.id);
  if (!livro) {
    return res.status(404).json({ error: 'Livro não encontrado.' });
  }

  const emprestimosAtivos = db.prepare(
    "SELECT id FROM emprestimos WHERE livro_id = ? AND status = 'ativo'"
  ).get(req.params.id);

  if (emprestimosAtivos) {
    return res.status(400).json({ error: 'Não é possível remover um livro com empréstimos ativos.' });
  }

  db.prepare('DELETE FROM livros WHERE id = ?').run(req.params.id);
  res.json({ message: 'Livro removido com sucesso.' });
});

module.exports = router;
