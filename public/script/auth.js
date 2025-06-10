// public/js/auth.js
const form    = document.getElementById('loginForm');
// não precisamos mais desses:
// const errorEl = document.getElementById('error');
// const successEl = document.getElementById('success');

// instancia o Notyf
const notyf = new Notyf();

form.addEventListener('submit', async e => {
  e.preventDefault();

  const username = form.username.value.trim();
  const password = form.password.value;

  try {
    const res = await fetch('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();

    if (!res.ok) {
      // mostra erro com Notyf
      notyf.error(data.error || 'Falha na autenticação');
      return;
    }

    // sucesso: guarda token e notifica
    localStorage.setItem('token', data.token);
    notyf.success('Login bem-sucedido!');

    // redireciona após 1s
    setTimeout(() => {
      window.location.href = '/';
    }, 1000);

  } catch (err) {
    notyf.error(err.message);
  }
});
