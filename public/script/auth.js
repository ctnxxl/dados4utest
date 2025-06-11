const form = document.getElementById('loginForm');
const notyf = new Notyf();

form.addEventListener('submit', async e => {
  e.preventDefault();

  // 🔐 Limpa qualquer dado de login antigo
  localStorage.removeItem('token');
  sessionStorage.clear(); // se usar sessões
  if ('caches' in window) {
    caches.keys().then(keys => keys.forEach(k => caches.delete(k)));
  }

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

    // ✅ Salva o novo token
    localStorage.setItem('token', data.token);
    notyf.success('Login bem-sucedido!');

    // ✅ Redireciona e força nova instância da página
    setTimeout(() => {
      window.location.href = '/?v=' + new Date().getTime(); // cache busting
    }, 500);

  } catch (err) {
    notyf.error('Erro ao conectar com o servidor');
    console.error(err);
  }
});
