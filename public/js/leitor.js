async function verificarAuth() {
  try {
    const resp = await fetch('/api/auth/me');
    if (!resp.ok) return window.location.href = '/';
    const data = await resp.json();
    if (data.perfil !== 'leitor') return window.location.href = '/bibliotecario.html';
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
  document.getElementById('secao-catalogo').classList.add('hidden');
  document.getElementById('secao-meus-emprestimos').classList.add('hidden');
  document.querySelectorAll('.tab-nav').forEach(b => b.classList.remove('active'));

  if (secao === 'catalogo') {
    document.getElementById('secao-catalogo').classList.remove('hidden');
    document.querySelectorAll('.tab-nav')[0].classList.add('active');
    carregarLivros();
  } else {
    document.getElementById('secao-meus-emprestimos').classList.remove('hidden');
    document.querySelectorAll('.tab-nav')[1].classList.add('active');
    carregarMeusEmprestimos();
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
      tbody.innerHTML = '<tr><td colspan="6" class="empty">Nenhum livro disponível no catálogo.</td></tr>';
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
          ${l.quantidade_disponivel > 0
            ? `<button onclick="solicitarEmprestimo(${l.id}, '${escHtml(l.titulo)}')" class="btn btn-sm btn-primary">Solicitar Empréstimo</button>`
            : `<span style="color:#999;font-size:12px">Sem exemplares</span>`
          }
        </td>
      </tr>
    `).join('');
  } catch {
    mostrarMensagem('Erro ao carregar catálogo.', 'erro');
  }
}

async function solicitarEmprestimo(livroId, tituloLivro) {
  if (!confirm(`Confirmar empréstimo do livro "${tituloLivro}"?\n\nPrazo de devolução: 14 dias.`)) return;

  try {
    const resp = await fetch('/api/emprestimos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ livro_id: livroId })
    });
    const data = await resp.json();

    if (!resp.ok) return mostrarMensagem(data.error, 'erro');

    const [ano, mes, dia] = data.data_devolucao_prevista.split('-');
    mostrarMensagem(`Empréstimo realizado! Devolução prevista para ${dia}/${mes}/${ano}.`, 'sucesso');
    carregarLivros();
  } catch {
    mostrarMensagem('Erro ao solicitar empréstimo.', 'erro');
  }
}

async function carregarMeusEmprestimos() {
  try {
    const resp = await fetch('/api/emprestimos/meus');
    const emprestimos = await resp.json();
    const tbody = document.getElementById('corpo-emprestimos');

    if (!emprestimos.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="empty">Você não possui empréstimos.</td></tr>';
      return;
    }

    tbody.innerHTML = emprestimos.map(e => `
      <tr>
        <td><strong>${escHtml(e.titulo_livro)}</strong><br><small style="color:#666">${escHtml(e.autor_livro)}</small></td>
        <td>${formatarData(e.data_emprestimo)}</td>
        <td>${formatarData(e.data_devolucao_prevista)}</td>
        <td>${e.data_devolucao_real ? formatarData(e.data_devolucao_real) : '-'}</td>
        <td><span class="badge badge-${e.status}">${traduzirStatus(e.status)}</span></td>
        <td>
          ${e.status !== 'devolvido'
            ? `<button onclick="solicitarDevolucao(${e.id})" class="btn btn-sm btn-outline-dark">Solicitar Devolução</button>`
            : `<span style="color:#999;font-size:12px">Concluído</span>`
          }
        </td>
      </tr>
    `).join('');
  } catch {
    mostrarMensagem('Erro ao carregar empréstimos.', 'erro');
  }
}

async function solicitarDevolucao(id) {
  if (!confirm('Confirmar solicitação de devolução? O bibliotecário irá registrar a devolução.')) return;

  try {
    const resp = await fetch(`/api/emprestimos/${id}/solicitar-devolucao`, { method: 'PUT' });
    const data = await resp.json();

    if (!resp.ok) return mostrarMensagem(data.error, 'erro');
    mostrarMensagem(data.message, 'sucesso');
  } catch {
    mostrarMensagem('Erro ao solicitar devolução.', 'erro');
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
