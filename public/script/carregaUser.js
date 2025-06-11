// public/js/carregaUser.js

export async function carregarNomeDoUsuario() {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.replace('/login');
      return;
    }

    const resposta = await fetch('/api/user/me?t=' + new Date().getTime(), { // evita cache
      headers: {
        'Authorization': 'Bearer ' + token
      },
      cache: 'no-store'
    });

    if (!resposta.ok) {
      localStorage.removeItem('token'); // se o token for inválido, limpa
      sessionStorage.clear();
      window.location.replace('/login');
      return;
    }

    const dados = await resposta.json();
    if (!dados.username) throw new Error('Resposta malformada');

    const nomeFormatado = dados.username.charAt(0).toUpperCase() + dados.username.slice(1).toLowerCase();

    const span = document.getElementById('user-name');
    if (span) span.innerText = `Olá, ${nomeFormatado}`;

  } catch (erro) {
    console.error('Erro ao carregar nome do usuário:', erro);
    localStorage.removeItem('token');
    sessionStorage.clear();
    window.location.replace('/login');
  }
}
