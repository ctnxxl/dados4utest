const form = document.getElementById('loginForm');
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
      notyf.error(data.error || 'Falha na autenticação');
      return;
    }

    // ✅ Limpa todos os dados anteriores e força novo token
    localStorage.clear();
    sessionStorage.clear(); // extra: limpa também sessão, se usada
    caches.keys().then(names => names.forEach(n => caches.delete(n))); // limpa service workers, se tiver

    // ✅ Salva novo token corretamente
    localStorage.setItem('token', data.token);
    notyf.success('Login bem-sucedido!');

    // ✅ Redireciona e força recarregamento sem cache
    setTimeout(() => {
      window.location.href = '/?t=' + new Date().getTime(); // cache busting
    }, 500);

  } catch (err) {
    notyf.error(err.message);
  }
});
