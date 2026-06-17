async function verificarAuth() {
  try {
    const resp = await fetch('/api/auth/me');
    if (!resp.ok) return window.location.href = '/';
    const data = await resp.json();
    if (data.perfil !== 'bibliotecario') return window.location.href = '/leitor.html';
    document.getElementById('nome-usuario').textContent = data.nome;
  } catch {
    window.location.href = '/';
  }
}

async function logout() {
  await fetch('/api/auth/logout', { method: 'POST' });
  window.location.href = '/';
}

function mostrarSecao(secao) {
  document.getElementById('secao-livros').classList.add('hidden');
  document.getElementById('secao-emprestimos').classList.add('hidden');
  document.querySelectorAll('.tab-nav').forEach(b => b.classList.remove('active'));

  if (secao === 'livros') {
    document.getElementById('secao-livros').classList.remove('hidden');
    document.querySelectorAll('.tab-nav')[0].classList.add('active');
    carregarLivros();
  } else {
    document.getElementById('secao-emprestimos').classList.remove('hidden');
    document.querySelectorAll('.tab-nav')[1].classList.add('active');
    carregarEmprestimos();
  }
}

function mostrarMensagem(texto, tipo) {
  const el = document.getElementById('mensagem');
  el.textContent = texto;
  el.className = `mensagem ${tipo}`;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 4000);
}

async function carregarLivros() {
  try {
    const resp = await fetch('/api/livros');
    const livros = await resp.json();
    const tbody = document.getElementById('corpo-livros');

    if (!livros.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="empty">Nenhum livro cadastrado.</td></tr>';
      return;
    }

    tbody.innerHTML = livros.map(l => `
      <tr>
        <td>${l.id}</td>
        <td><strong>${escHtml(l.titulo)}</strong></td>
        <td>${escHtml(l.autor)}</td>
        <td>${l.ano_publicacao || '-'}</td>
        <td><span class="badge ${l.quantidade_disponivel > 0 ? 'badge-green' : 'badge-atrasado'}">${l.quantidade_disponivel}</span></td>
        <td>
          <div class="actions">
            <button onclick="editarLivro(${l.id})" class="btn btn-sm btn-warning">Editar</button>
            <button onclick="excluirLivro(${l.id})" class="btn btn-sm btn-danger">Excluir</button>
          </div>
        </td>
      </tr>
    `).join('');
  } catch {
    mostrarMensagem('Erro ao carregar livros.', 'erro');
  }
}

function mostrarFormLivro() {
  document.getElementById('form-livro-container').classList.remove('hidden');
  document.getElementById('form-livro-titulo').textContent = 'Cadastrar Novo Livro';
  document.getElementById('form-livro').reset();
  document.getElementById('livro-id').value = '';
}

function cancelarFormLivro() {
  document.getElementById('form-livro-container').classList.add('hidden');
  document.getElementById('form-livro').reset();
}

async function editarLivro(id) {
  try {
    const resp = await fetch(`/api/livros/${id}`);
    const livro = await resp.json();

    document.getElementById('livro-id').value = livro.id;
    document.getElementById('livro-titulo').value = livro.titulo;
    document.getElementById('livro-autor').value = livro.autor;
    document.getElementById('livro-ano').value = livro.ano_publicacao || '';
    document.getElementById('livro-qtd').value = livro.quantidade_disponivel;

    document.getElementById('form-livro-titulo').textContent = 'Editar Livro';
    document.getElementById('form-livro-container').classList.remove('hidden');
    document.getElementById('form-livro-container').scrollIntoView({ behavior: 'smooth' });
  } catch {
    mostrarMensagem('Erro ao carregar livro.', 'erro');
  }
}

async function excluirLivro(id) {
  if (!confirm('Tem certeza que deseja excluir este livro?')) return;

  try {
    const resp = await fetch(`/api/livros/${id}`, { method: 'DELETE' });
    const data = await resp.json();

    if (!resp.ok) return mostrarMensagem(data.error, 'erro');
    mostrarMensagem('Livro excluído com sucesso.', 'sucesso');
    carregarLivros();
  } catch {
    mostrarMensagem('Erro ao excluir livro.', 'erro');
  }
}

document.getElementById('form-livro').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('livro-id').value;
  const payload = {
    titulo: document.getElementById('livro-titulo').value,
    autor: document.getElementById('livro-autor').value,
    ano_publicacao: document.getElementById('livro-ano').value || null,
    quantidade_disponivel: parseInt(document.getElementById('livro-qtd').value)
  };

  try {
    const resp = await fetch(id ? `/api/livros/${id}` : '/api/livros', {
      method: id ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await resp.json();

    if (!resp.ok) return mostrarMensagem(data.error, 'erro');
    mostrarMensagem(id ? 'Livro atualizado com sucesso.' : 'Livro cadastrado com sucesso.', 'sucesso');
    cancelarFormLivro();
    carregarLivros();
  } catch {
    mostrarMensagem('Erro ao salvar livro.', 'erro');
  }
});

async function carregarEmprestimos() {
  try {
    const resp = await fetch('/api/emprestimos');
    const emprestimos = await resp.json();
    const tbody = document.getElementById('corpo-emprestimos');

    if (!emprestimos.length) {
      tbody.innerHTML = '<tr><td colspan="7" class="empty">Nenhum empréstimo encontrado.</td></tr>';
      return;
    }

    tbody.innerHTML = emprestimos.map(e => `
      <tr>
        <td>${e.id}</td>
        <td>${escHtml(e.nome_leitor)}</td>
        <td>${escHtml(e.titulo_livro)}</td>
        <td>${formatarData(e.data_emprestimo)}</td>
        <td>${formatarData(e.data_devolucao_prevista)}</td>
        <td><span class="badge badge-${e.status}">${traduzirStatus(e.status)}</span></td>
        <td>
          <div class="actions">
            ${e.status !== 'devolvido' ? `<button onclick="aprovarDevolucao(${e.id})" class="btn btn-sm btn-success">Aprovar Devolução</button>` : `<span style="color:#999;font-size:12px">Devolvido em ${formatarData(e.data_devolucao_real)}</span>`}
          </div>
        </td>
      </tr>
    `).join('');
  } catch {
    mostrarMensagem('Erro ao carregar empréstimos.', 'erro');
  }
}

async function aprovarDevolucao(id) {
  if (!confirm('Confirmar a devolução deste livro?')) return;

  try {
    const resp = await fetch(`/api/emprestimos/${id}/devolver`, { method: 'PUT' });
    const data = await resp.json();

    if (!resp.ok) return mostrarMensagem(data.error, 'erro');
    mostrarMensagem('Devolução registrada com sucesso.', 'sucesso');
    carregarEmprestimos();
  } catch {
    mostrarMensagem('Erro ao registrar devolução.', 'erro');
  }
}

function formatarData(data) {
  if (!data) return '-';
  const [ano, mes, dia] = data.split('-');
  return `${dia}/${mes}/${ano}`;
}

function traduzirStatus(status) {
  const map = { ativo: 'Ativo', devolvido: 'Devolvido', atrasado: 'Atrasado' };
  return map[status] || status;
}

function escHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

verificarAuth();
carregarLivros();
