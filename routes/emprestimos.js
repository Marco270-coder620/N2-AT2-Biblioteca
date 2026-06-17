const express = require('express');
const db = require('../database');
const { requireLogin, requireBibliotecario, requireLeitor } = require('../middleware/auth');

const router = express.Router();

function atualizarAtrasados() {
  const hoje = new Date().toISOString().split('T')[0];
  db.prepare(
    "UPDATE emprestimos SET status = 'atrasado' WHERE status = 'ativo' AND data_devolucao_prevista < ?"
  ).run(hoje);
}

router.get('/', requireBibliotecario, (req, res) => {
  atualizarAtrasados();
  const emprestimos = db.prepare(`
    SELECT e.*, u.nome as nome_leitor, l.titulo as titulo_livro
    FROM emprestimos e
    JOIN usuarios u ON e.leitor_id = u.id
    JOIN livros l ON e.livro_id = l.id
    ORDER BY e.data_emprestimo DESC
  `).all();
  res.json(emprestimos);
});

router.get('/meus', requireLeitor, (req, res) => {
  atualizarAtrasados();
  const emprestimos = db.prepare(`
    SELECT e.*, l.titulo as titulo_livro, l.autor as autor_livro
    FROM emprestimos e
    JOIN livros l ON e.livro_id = l.id
    WHERE e.leitor_id = ?
    ORDER BY e.data_emprestimo DESC
  `).all(req.session.userId);
  res.json(emprestimos);
});

router.post('/', requireLeitor, (req, res) => {
  const { livro_id } = req.body;

  if (!livro_id) {
    return res.status(400).json({ error: 'ID do livro é obrigatório.' });
  }

  const livro = db.prepare('SELECT * FROM livros WHERE id = ?').get(livro_id);
  if (!livro) {
    return res.status(404).json({ error: 'Livro não encontrado.' });
  }

  if (livro.quantidade_disponivel <= 0) {
    return res.status(400).json({ error: 'Livro sem exemplares disponíveis.' });
  }

  const emprestimoAtivo = db.prepare(
    "SELECT id FROM emprestimos WHERE leitor_id = ? AND livro_id = ? AND status IN ('ativo', 'atrasado')"
  ).get(req.session.userId, livro_id);

  if (emprestimoAtivo) {
    return res.status(400).json({ error: 'Você já possui este livro emprestado.' });
  }

  const hoje = new Date();
  const dataEmprestimo = hoje.toISOString().split('T')[0];
  const dataDevolucaoPrevista = new Date(hoje.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const emprestimoResult = db.prepare(
    'INSERT INTO emprestimos (livro_id, leitor_id, data_emprestimo, data_devolucao_prevista, status) VALUES (?, ?, ?, ?, ?)'
  ).run(livro_id, req.session.userId, dataEmprestimo, dataDevolucaoPrevista, 'ativo');

  db.prepare('UPDATE livros SET quantidade_disponivel = quantidade_disponivel - 1 WHERE id = ?').run(livro_id);

  res.status(201).json({
    message: 'Empréstimo solicitado com sucesso.',
    id: emprestimoResult.lastInsertRowid,
    data_devolucao_prevista: dataDevolucaoPrevista
  });
});

router.put('/:id/devolver', requireBibliotecario, (req, res) => {
  const emprestimo = db.prepare('SELECT * FROM emprestimos WHERE id = ?').get(req.params.id);
  if (!emprestimo) {
    return res.status(404).json({ error: 'Empréstimo não encontrado.' });
  }

  if (emprestimo.status === 'devolvido') {
    return res.status(400).json({ error: 'Este empréstimo já foi devolvido.' });
  }

  const hoje = new Date().toISOString().split('T')[0];

  db.prepare(
    "UPDATE emprestimos SET status = 'devolvido', data_devolucao_real = ? WHERE id = ?"
  ).run(hoje, req.params.id);

  db.prepare('UPDATE livros SET quantidade_disponivel = quantidade_disponivel + 1 WHERE id = ?').run(emprestimo.livro_id);

  res.json({ message: 'Devolução registrada com sucesso.' });
});

router.put('/:id/solicitar-devolucao', requireLeitor, (req, res) => {
  const emprestimo = db.prepare(
    'SELECT * FROM emprestimos WHERE id = ? AND leitor_id = ?'
  ).get(req.params.id, req.session.userId);

  if (!emprestimo) {
    return res.status(404).json({ error: 'Empréstimo não encontrado.' });
  }

  if (emprestimo.status === 'devolvido') {
    return res.status(400).json({ error: 'Este empréstimo já foi devolvido.' });
  }

  res.json({ message: 'Solicitação de devolução registrada. Aguarde confirmação do bibliotecário.' });
});

router.delete('/:id', requireBibliotecario, (req, res) => {
  const emprestimo = db.prepare('SELECT * FROM emprestimos WHERE id = ?').get(req.params.id);
  if (!emprestimo) {
    return res.status(404).json({ error: 'Empréstimo não encontrado.' });
  }

  if (emprestimo.status !== 'devolvido') {
    db.prepare('UPDATE livros SET quantidade_disponivel = quantidade_disponivel + 1 WHERE id = ?').run(emprestimo.livro_id);
  }

  db.prepare('DELETE FROM emprestimos WHERE id = ?').run(req.params.id);
  res.json({ message: 'Empréstimo removido com sucesso.' });
});

module.exports = router;
