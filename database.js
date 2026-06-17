const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const db = new Database(path.join(__dirname, 'biblioteca.db'));

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome VARCHAR NOT NULL,
    email VARCHAR NOT NULL UNIQUE,
    senha VARCHAR NOT NULL,
    perfil TEXT NOT NULL CHECK(perfil IN ('bibliotecario', 'leitor'))
  );

  CREATE TABLE IF NOT EXISTS livros (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    titulo VARCHAR NOT NULL,
    autor VARCHAR NOT NULL,
    ano_publicacao INTEGER,
    quantidade_disponivel INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS emprestimos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    livro_id INTEGER NOT NULL,
    leitor_id INTEGER NOT NULL,
    data_emprestimo DATE NOT NULL,
    data_devolucao_prevista DATE NOT NULL,
    data_devolucao_real DATE,
    status TEXT NOT NULL DEFAULT 'ativo' CHECK(status IN ('ativo', 'devolvido', 'atrasado')),
    FOREIGN KEY (livro_id) REFERENCES livros(id),
    FOREIGN KEY (leitor_id) REFERENCES usuarios(id)
  );
`);

const adminExists = db.prepare('SELECT id FROM usuarios WHERE email = ?').get('admin@biblioteca.com');
if (!adminExists) {
  const hash = bcrypt.hashSync('admin123', 10);
  db.prepare('INSERT INTO usuarios (nome, email, senha, perfil) VALUES (?, ?, ?, ?)').run(
    'Administrador', 'admin@biblioteca.com', hash, 'bibliotecario'
  );
}

module.exports = db;
