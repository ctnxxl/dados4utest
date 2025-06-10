// public/js/carregaUser.js

export async function carregarNomeDoUsuario() {
  try {
    const resposta = await fetch('/api/user/me', {
      headers: {
        'Authorization': 'Bearer ' + localStorage.getItem('token') // se estiver usando token
      }
    });
    const dados = await resposta.json();
    const nomeFormatado = dados.username.charAt(0).toUpperCase() + dados.username.slice(1).toLowerCase();

    if (dados.username) {
      const span = document.getElementById('user-name');
      if (span) span.innerText = `Olá, ${nomeFormatado}`;
    }
  } catch (erro) {
    console.error('Erro ao carregar nome do usuário:', erro);
  }
}
