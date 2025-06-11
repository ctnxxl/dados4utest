const form = document.getElementById('loginForm');
const notyf = new Notyf();

form.addEventListener('submit', async e => {
  e.preventDefault();

  localStorage.removeItem('token');
  sessionStorage.clear();

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
      notyf.error(data.error || 'Falha na autenticação');
      return;
    }

    localStorage.setItem('token', data.token);
    notyf.success('Login bem-sucedido!');

    // Redireciona e força recarregamento total e sem cache
    setTimeout(() => {
      window.location.href = '/';
      window.location.reload(true);
    }, 500);

  } catch (err) {
    notyf.error('Erro ao conectar com o servidor');
    console.error(err);
  }
});
