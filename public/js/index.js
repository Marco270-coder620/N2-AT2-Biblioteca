function mostrarTab(tab) {
  const formLogin = document.getElementById('form-login');
  const formRegistro = document.getElementById('form-registro');
  const botoes = document.querySelectorAll('.tab-btn');

  if (tab === 'login') {
    formLogin.classList.remove('hidden');
    formRegistro.classList.add('hidden');
    botoes[0].classList.add('active');
    botoes[1].classList.remove('active');
  } else {
    formLogin.classList.add('hidden');
    formRegistro.classList.remove('hidden');
    botoes[0].classList.remove('active');
    botoes[1].classList.add('active');
  }
  limparMensagem();
}

function mostrarMensagem(texto, tipo) {
  const el = document.getElementById('mensagem');
  el.textContent = texto;
  el.className = `mensagem ${tipo}`;
  el.classList.remove('hidden');
}

function limparMensagem() {
  const el = document.getElementById('mensagem');
  el.classList.add('hidden');
}

document.getElementById('form-login').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('login-email').value;
  const senha = document.getElementById('login-senha').value;

  try {
    const resp = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, senha })
    });

    const data = await resp.json();

    if (!resp.ok) {
      return mostrarMensagem(data.error || 'Erro ao fazer login.', 'erro');
    }

    if (data.perfil === 'bibliotecario') {
      window.location.href = '/bibliotecario.html';
    } else {
      window.location.href = '/leitor.html';
    }
  } catch {
    mostrarMensagem('Erro de conexão com o servidor.', 'erro');
  }
});

document.getElementById('form-registro').addEventListener('submit', async (e) => {
  e.preventDefault();
  const nome = document.getElementById('reg-nome').value;
  const email = document.getElementById('reg-email').value;
  const senha = document.getElementById('reg-senha').value;
  const perfil = document.getElementById('reg-perfil').value;

  if (!perfil) {
    return mostrarMensagem('Selecione um perfil.', 'erro');
  }

  try {
    const resp = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, email, senha, perfil })
    });

    const data = await resp.json();

    if (!resp.ok) {
      return mostrarMensagem(data.error || 'Erro ao cadastrar.', 'erro');
    }

    mostrarMensagem('Cadastro realizado! Faça login para continuar.', 'sucesso');
    document.getElementById('form-registro').reset();
    setTimeout(() => mostrarTab('login'), 1500);
  } catch {
    mostrarMensagem('Erro de conexão com o servidor.', 'erro');
  }
});

(async () => {
  try {
    const resp = await fetch('/api/auth/me');
    if (resp.ok) {
      const data = await resp.json();
      if (data.perfil === 'bibliotecario') {
        window.location.href = '/bibliotecario.html';
      } else {
        window.location.href = '/leitor.html';
      }
    }
  } catch {}
})();
