export async function carregarNomeDoUsuario() {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.replace('/login');
      return;
    }

    const resposta = await fetch('/api/user/me?t=' + new Date().getTime(), {
      headers: {
        'Authorization': 'Bearer ' + token
      },
      cache: 'no-store'
    });

    if (!resposta.ok) {
      localStorage.clear();
      sessionStorage.clear();
      window.location.replace('/login');
      return;
    }

    const dados = await resposta.json();
    if (!dados.username) throw new Error('Resposta malformada');

    const span = document.getElementById('user-name');
    if (span) {
      span.innerText = `Olá, ${capitalize(dados.username)}`;
    }
  } catch (erro) {
    console.error('Erro ao carregar nome do usuário:', erro);
    localStorage.clear();
    sessionStorage.clear();
    window.location.replace('/login');
  }
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}
