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
    localStorage.removeItem('token'); // limpa qualquer antigo (garante)
    localStorage.setItem('token', data.token); // grava novo
    notyf.success('Login bem-sucedido!');
    console.log('Token atual:', localStorage.getItem('token'));

    setTimeout(() => {
      window.location.replace('/');
    }, 1000);

  } catch (err) {
    notyf.error(err.message);
  }
});
