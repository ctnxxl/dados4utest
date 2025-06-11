// public/js/auth.js

const form = document.getElementById('loginForm');
const notyf = new Notyf();

form.addEventListener('submit', async e => {
  e.preventDefault();

  // 🔐 Limpa qualquer dado de login anterior
  localStorage.removeItem('token');
  sessionStorage.clear();

  if ('caches' in window) {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
    } catch (err) {
      console.warn('Erro ao limpar caches:', err);
    }
  }

  const username = form.username.value.trim();
  const password = form.password.value;

  try {
    const res = await fetch('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
      cache: 'no-store'
    });

    const data = await res.json();

    if (!res.ok) {
      notyf.error(data.error || 'Falha na autenticação');
      return;
    }

    // ✅ Salva o novo token corretamente
    localStorage.setItem('token', data.token);
    notyf.success('Login bem-sucedido!');

    // ✅ Redireciona com bust de cache
    setTimeout(() => {
      window.location.href = '/?v=' + new Date().getTime();
    }, 500);

  } catch (err) {
    console.error('Erro no login:', err);
    notyf.error('Erro ao conectar com o servidor');
  }
});
