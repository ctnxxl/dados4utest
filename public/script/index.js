// public/js/index.js
import { carregarNomeDoUsuario } from "./carregaUser.js";

const notyf = new Notyf();

// Verifica se o token existe e ainda é válido
const token = localStorage.getItem('token');
if (!token) {
  window.location.replace('/login');
} else {
  fetch('/api/user/me', {
    headers: { Authorization: 'Bearer ' + token }
  })
    .then(res => {
      if (res.status === 401 || res.status === 403) {
        localStorage.removeItem('token');
        window.location.replace('/login');
        return;
      }
      return res.json();
    })
    .then(data => {
      if (data?.username) {
        document.getElementById('user-name').textContent = `Olá, ${data.username}`;
      }
    })
    .catch(() => {
      localStorage.removeItem('token');
      window.location.replace('/login');
    });
}

carregarNomeDoUsuario();

let tentativas = 0;
const maxTentativas = 10;
const intervaloTentativas = 5000;
let swalAberto = false;

const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    localStorage.clear();
    sessionStorage.clear();
    caches.keys().then(names => names.forEach(n => caches.delete(n))); // limpa SW cache
    window.location.href = '/login?t=' + new Date().getTime(); // força recarregamento
  });
}


const adminBtn = document.getElementById('adminBtn');
if (adminBtn) {
  adminBtn.addEventListener('click', () => {
    window.location.replace('/admin-panel');
  });
}

function aplicarMascara(input) {
  const tipo = document.querySelector('input[name="tipo"]:checked').value;
  if (tipo === 'cpf_cnpj') {
    maskCPF(input);
  } else if (tipo === 'telefone') {
    maskTelefone(input);
  }
}

function maskCPF(input) {
  let v = input.value.replace(/\D/g, '').slice(0, 11);
  v = v.replace(/(\d{3})(\d)/, '$1.$2');
  v = v.replace(/(\d{3})(\d)/, '$1.$2');
  v = v.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  input.value = v;
}

function maskTelefone(input) {
  let v = input.value.replace(/\D/g, '').slice(0, 11);
  if (v.length >= 11) {
    v = v.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
  } else if (v.length >= 10) {
    v = v.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3');
  } else if (v.length >= 6) {
    v = v.replace(/^(\d{2})(\d{4,})$/, '($1) $2');
  } else if (v.length >= 3) {
    v = v.replace(/^(\d{2})(\d{0,})$/, '($1) $2');
  }
  input.value = v;
}

function preencherResultado(data) {
  if (swalAberto) {
    Swal.close();
    swalAberto = false;
  }

  document.querySelector('.result-grid').classList.remove('ocultar-detalhes');
  document.querySelector('.result-grid').style.display = 'grid';

  document.getElementById('cpf').textContent = data.cpf || '-';
  document.getElementById('nome_completo').textContent = data.nome_completo || '-';
  document.getElementById('data_nasc').textContent = data.data_nasc || '-';
  document.getElementById('sexo').textContent = data.sexo || '-';
  document.getElementById('nome_mae').textContent = data.nome_mae || '-';
  document.getElementById('falecido').textContent = data.falecido || '-';
  document.getElementById('ocupacao').textContent = data.ocupacao || '-';

  const telContainer = document.getElementById('telefones');
  telContainer.innerHTML = '';
  if (Array.isArray(data.telefones) && data.telefones.length > 0) {
    data.telefones.forEach(t => {
      const div = document.createElement('div');
      div.textContent = t;
      telContainer.appendChild(div);
    });
  } else {
    telContainer.textContent = '-';
  }

  const emailContainer = document.getElementById('emails');
  emailContainer.innerHTML = '';
  if (Array.isArray(data.emails) && data.emails.length > 0) {
    data.emails.forEach(e => {
      const div = document.createElement('div');
      div.textContent = e;
      emailContainer.appendChild(div);
    });
  } else {
    emailContainer.textContent = '-';
  }

  const parentContainer = document.getElementById('parentes');
  parentContainer.innerHTML = '';
  if (Array.isArray(data.parentes) && data.parentes.length > 0) {
    const table = document.createElement('table');
    table.className = 'parent-table';

    data.parentes.forEach(p => {
      const [cpf, grau] = p.match(/^(.+?) \((.*?)\)$/)?.slice(1) || ['-', '-'];
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>-</td><td>${cpf}</td><td>${grau}</td>`;
      table.appendChild(tr);
    });

    parentContainer.appendChild(table);
  } else {
    parentContainer.textContent = '-';
  }
}

function fazerConsulta() {
  let valor = document.getElementById('valor').value.trim();
  const campo = document.querySelector('input[name="tipo"]:checked').value;

  if (campo === 'cpf_cnpj' || campo === 'telefone') {
    valor = valor.replace(/\D/g, '');
  }

  fetch('/consultar', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + localStorage.getItem('token')
    },
    body: JSON.stringify({ tipo: campo, valor })
  })
    .then(res => res.json())
    .then(data => {
      if (data.aguardando) {
        tentativas++;
        if (!swalAberto) {
          Swal.fire({
            title: 'Realizando consulta em tempo real...',
            allowOutsideClick: false,
            allowEscapeKey: false,
            showConfirmButton: false,
            showCancelButton: false,
            didOpen: () => Swal.showLoading()
          });
          swalAberto = true;
        }

        if (tentativas < maxTentativas) {
          setTimeout(fazerConsulta, intervaloTentativas);
        } else {
          Swal.close();
          swalAberto = false;
          notyf.error('Tempo de espera excedido. Tente novamente mais tarde.');
          tentativas = 0;
        }
        return;
      }

      if (swalAberto) {
        Swal.close();
        swalAberto = false;
      }
      tentativas = 0;

      if (data.erro) {
        notyf.error(data.erro);
        return;
      }

      if (data.multiplos_cpfs) {
        document.querySelector('.result-grid').classList.add('ocultar-detalhes');
        const cpfDiv = document.getElementById('cpf');
        cpfDiv.innerHTML = '<strong>Resultados encontrados:</strong><br><br>';
        document.querySelector('.result-grid').style.display = 'block';

        data.dados.forEach(pessoa => {
          const div = document.createElement('div');
          div.className = 'cpf-card';
          div.innerHTML = `
            <strong>CPF:</strong> ${pessoa.cpf}<br>
            <strong>Nome:</strong> ${pessoa.nome_completo}<br>
            <strong>Data de Nasc.:</strong> ${pessoa.data_nasc}`;

          const botao = document.createElement('button');
          botao.textContent = 'CONSULTAR CPF';
          botao.className = 'consultar-cpf-btn';
          botao.onclick = () => {
            document.getElementById('valor').value = pessoa.cpf;
            document.querySelector('input[value="cpf_cnpj"]').checked = true;
            fazerConsulta();
          };

          div.appendChild(document.createElement('br'));
          div.appendChild(botao);
          div.style.padding = '0.6rem 0';
          cpfDiv.appendChild(div);
        });

        const detalhesDiv = document.getElementById('detalhes');
        if (detalhesDiv) detalhesDiv.style.display = 'none';
        return;
      }

      preencherResultado(data);
    })
    .catch(err => {
      console.error('>> catch geral de fetch:', err);
      if (swalAberto) {
        Swal.close();
        swalAberto = false;
      }
      notyf.error('Erro ao consultar dados.');
    });
}

window.fazerConsulta = fazerConsulta;
window.aplicarMascara = aplicarMascara;
