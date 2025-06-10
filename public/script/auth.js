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

    // ✅ limpa cache e define novo token
    localStorage.clear();
    localStorage.setItem('token', data.token);
    notyf.success('Login bem-sucedido!');

    setTimeout(() => {
      window.location.replace('/');
    }, 1000);

  } catch (err) {
    notyf.error(err.message);
  }
});
