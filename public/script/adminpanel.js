// public/script/adminpanel.js
  const payload = JSON.parse(atob(token.split('.')[1]));

  const isSuperadmin = payload.role === 'superadmin';
  const roleSelect = document.getElementById('roleSelect');

  if (!isSuperadmin) {
    // Remove as opções de admin e superadmin se for apenas admin
    [...roleSelect.options].forEach(opt => {
      if (opt.value !== 'user') {
        opt.remove();
      }
    });
  }
// Botão “Voltar” (se existir)
const voltarBtn = document.getElementById('voltarBtn');
if (voltarBtn) {
  voltarBtn.addEventListener('click', () => {
    window.location.replace('/');
  });
}

(async () => {
  const token = localStorage.getItem('token');

  // 1) Função para buscar o "me" e garantir que ainda está logado
  async function fetchMe() {
    const res = await fetch('/api/me', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    if (!res.ok) throw new Error('Não autenticado');
    return res.json();
  }

  // 2) Carregar o histórico
  async function loadHistory(user) {
    const url = user.role === 'admin'
      ? `/api/history?createdBy=${user.id}`
      : '/api/history';

    const res = await fetch(url, {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    if (!res.ok) throw new Error('Falha ao buscar histórico');

    const list = await res.json();
    const tbody = document.querySelector('#history-table tbody');
    tbody.innerHTML = '';

    list.forEach(entry => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${entry.id}</td>
        <td>${entry.userName}</td>
        <td>${entry.term}</td>
        <td>${new Date(entry.createdAt).toLocaleString()}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  // 3) Criar usuário
  async function handleCreateUser(e, me) {
    e.preventDefault();
    const form = e.target;

    // lê campos diretamente pelo atributo name
    const username = form.querySelector('input[name="username"]').value;
    const email    = form.querySelector('input[name="email"]').value;
    const password = form.querySelector('input[name="password"]').value;
    const role     = form.querySelector('select[name="role"]').value;

    // controle de quem pode criar superadmin
    if (role === 'superadmin' && me.role !== 'superadmin') {
      return alert('Somente superadmin pode criar outro superadmin');
    }

    const res = await fetch('/api/users', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify({ username, email, password, role })
    });

    if (!res.ok) {
      const err = await res.json();
      return alert('Erro: ' + (err.error || err.message));
    }

    alert('Usuário criado com sucesso!');
    form.reset();
    await loadHistory(me);
  }

  // === Boot do painel ===
  try {
    const me = await fetchMe();
    document.body.style.visibility = 'visible';

    // se não for superadmin, remove a opção de criar superadmin
    if (me.role !== 'superadmin') {
      const opt = document.querySelector('select[name=role] option[value=superadmin]');
      if (opt) opt.remove();
    }

    // vincula o form ao handler
    document
      .getElementById('form-create-user')
      .addEventListener('submit', e => handleCreateUser(e, me));

    // carrega o histórico já no load inicial
    await loadHistory(me);

  } catch (err) {
    console.error(err);
    window.location.replace('/adminpanel.html')
  }
})();
