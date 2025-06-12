// public/js/index.js
import { carregarNomeDoUsuario } from "./carregaUser.js";

const notyf = new Notyf();

// 0) Verifica se o token existe e é válido
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

// Long-polling controls
let tentativas = 0;
const maxTentativas = 10;
const intervaloTentativas = 5000;
let swalAberto = false;

// Logout limpa tudo e força reload sem cache
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    localStorage.clear();
    sessionStorage.clear();
    if ('caches' in window) caches.keys().then(keys => keys.forEach(k => caches.delete(k)));
    window.location.href = '/login?t=' + Date.now();
  });
}

// Admin Panel
const adminBtn = document.getElementById('adminBtn');
if (adminBtn) {
  adminBtn.addEventListener('click', () => window.location.replace('/admin-panel'));
}

// Máscaras
function aplicarMascara(input) {
  const tipo = document.querySelector('input[name="tipo"]:checked').value;
  if (tipo === 'cpf_cnpj') maskCpfCnpj(input);
  else if (tipo === 'telefone') maskTelefone(input);
}
function maskCpfCnpj(input) {
  let v = input.value.replace(/\D/g, '').slice(0, 14);
  if (v.length <= 11) {
    v = v
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  } else {
    v = v
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  }
  input.value = v;
}
function maskTelefone(input) {
  let v = input.value.replace(/\D/g, '').slice(0, 11);
  if (v.length >= 11)      v = v.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
  else if (v.length >= 10) v = v.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3');
  else if (v.length >= 6)  v = v.replace(/^(\d{2})(\d{4,})$/, '($1) $2');
  else if (v.length >= 3)  v = v.replace(/^(\d{2})(\d{0,})$/, '($1) $2');
  input.value = v;
}

// Preenche a grade de resultados (CPF ou CNPJ)
function preencherResultado(data) {
  // Fecha qualquer SweetAlert ainda aberto
  if (swalAberto) Swal.close(), swalAberto = false;

  const grid = document.querySelector('.result-grid');
  grid.classList.remove('ocultar-detalhes');
  grid.style.display = 'grid';
  grid.innerHTML = ''; // limpa conteúdo anterior

  // --- Bloco CNPJ ---
  if (data.cnpj) {
    grid.innerHTML = `
      <div class="label">CNPJ</div><div class="value">${data.cnpj ?? '-'}</div>
      <div class="label">Razão Social</div><div class="value">${data.razao_social ?? '-'}</div>
      <div class="label">Nome Fantasia</div><div class="value">${data.nome_fantasia ?? '-'}</div>
      <div class="label">Tipo</div><div class="value">${data.tipo ?? '-'}</div>
      <div class="label">Data Fundação</div><div class="value">${data.data_fundacao ?? '-'}</div>
      <div class="label">Situação</div><div class="value">${data.situacao ?? '-'}</div>
      <div class="label">CNAE Nº</div><div class="value">${data.cnae_numero ?? '-'}</div>
      <div class="label">CNAE Tipo</div><div class="value">${data.cnae_tipo ?? '-'}</div>
      <div class="label">CNAE Segmento</div><div class="value">${data.cnae_segmento ?? '-'}</div>
      <div class="label">CNAE Descrição</div><div class="value">${data.cnae_descricao ?? '-'}</div>
      <div class="label">E-mail</div><div class="value">${data.email ?? '-'}</div>
      <div class="label">Renda</div><div class="value">${data.renda ?? '-'}</div>
      <div class="label">Risco de Crédito</div><div class="value">${data.risco_credito ?? '-'}</div>
      <div class="label">Endereço</div><div class="value">${data.endereco ?? '-'}</div>
      <div class="label">Sociedade</div><div class="value">${data.sociedade ?? '-'}</div>
    `;
    return;
  }

  // --- Bloco CPF/PESSOA (campos fixos) ---
  grid.innerHTML = `
    <div class="label">CPF</div><div class="value">${data.cpf ?? '-'}</div>
    <div class="label">Nome Completo</div><div class="value">${data.nome_completo ?? '-'}</div>
    <div class="label">Data Nasc.</div><div class="value">${data.data_nasc ?? '-'}</div>
    <div class="label">Sexo</div><div class="value">${data.sexo ?? '-'}</div>
    <div class="label">Nome Mãe</div><div class="value">${data.nome_mae ?? '-'}</div>
    <div class="label">Falecido?</div><div class="value">${data.falecido ?? '-'}</div>
    <div class="label">Ocupação</div><div class="value">${data.ocupacao ?? '-'}</div>
  `;

  // --- Tabela de TELEFONES ---
  const telefones = Array.isArray(data.telefones) ? data.telefones : [];
  const telLabel = document.createElement('div');
  telLabel.className = 'label ocultavel';
  telLabel.textContent = 'Telefones';

  const telValue = document.createElement('div');
  telValue.className = 'value ocultavel';

  const telTable = document.createElement('table');
  telTable.className = 'telefone-table';

  // cabeçalho
  const telHead = document.createElement('tr');
  ['Número', 'Situação'].forEach(txt => {
    const th = document.createElement('th');
    th.textContent = txt;
    th.style.textAlign = 'center';
    telHead.appendChild(th);
  });
  telTable.appendChild(telHead);

  // linhas (placeholder se vazio)
  if (telefones.length === 0) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="text-align:center">-</td>
      <td style="text-align:center">-</td>
    `;
    telTable.appendChild(tr);
  } else {
    telefones.forEach(item => {
      const tr = document.createElement('tr');
      const num = item.numero   ?? '-';
      const sit = item.situacao ?? '-';
      tr.innerHTML = `
        <td style="text-align:center">${num}</td>
        <td style="text-align:center">${sit}</td>
      `;
      telTable.appendChild(tr);
    });
  }

  telValue.appendChild(telTable);
  grid.appendChild(telLabel);
  grid.appendChild(telValue);

  // --- Tabela de PARENTES ---
  const parentes = Array.isArray(data.parentes) ? data.parentes : [];
  const parLabel = document.createElement('div');
  parLabel.className = 'label ocultavel';
  parLabel.textContent = 'Parentes';

  const parValue = document.createElement('div');
  parValue.className = 'value ocultavel';

  const parTable = document.createElement('table');
  parTable.className = 'parent-table';

  // cabeçalho
  const parHead = document.createElement('tr');
  ['Nome Parente', 'CPF', 'Grau Parentesco'].forEach(txt => {
    const th = document.createElement('th');
    th.textContent = txt;
    th.style.textAlign = 'center';
    parHead.appendChild(th);
  });
  parTable.appendChild(parHead);

  // linhas (placeholder se vazio)
  if (parentes.length === 0) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="text-align:center">-</td>
      <td style="text-align:center">-</td>
      <td style="text-align:center">-</td>
    `;
    parTable.appendChild(tr);
  } else {
    parentes.forEach(item => {
      const tr = document.createElement('tr');
      const nome = item.nome_parente ?? '-';
      const cpf  = item.cpf_parente  ?? '-';
      const grau = item.grau        ?? '-';
      tr.innerHTML = `
        <td style="text-align:center">${nome}</td>
        <td style="text-align:center">${cpf}</td>
        <td style="text-align:center">${grau}</td>
      `;
      parTable.appendChild(tr);
    });
  }

  parValue.appendChild(parTable);
  grid.appendChild(parLabel);
  grid.appendChild(parValue);

  // --- Campos extras de CPF ---
  [
    ['Renda',            data.renda],
    ['Risco de Crédito', data.risco_credito],
    ['Endereço',         data.endereco],
    ['Sociedade',        data.sociedade]
  ].forEach(([label, val]) => {
    const l = document.createElement('div');
    l.className = 'label ocultavel';
    l.textContent = label;
    const v = document.createElement('div');
    v.className = 'value ocultavel';
    v.textContent = val ?? '-';
    grid.appendChild(l);
    grid.appendChild(v);
  });
}




// Função principal de consulta
async function fazerConsulta() {
  const raw = document.getElementById('valor').value.trim();
  const radio = document.querySelector('input[name="tipo"]:checked').value;
  console.log('Raw:', raw, 'Tipo rádio:', radio);

  // sempre mantém tipo = 'cpf_cnpj'
  let tipo = 'cpf_cnpj';
  let valor = raw.replace(/\D/g, '');

  if (radio === 'telefone') {
    tipo = 'numero_telefone';
    valor = raw.replace(/\D/g, '');
  } else if (radio === 'nome_completo' || radio === 'email') {
    tipo = radio;
    valor = raw;
  }

  // qual endpoint usar?
  const endpoint = (radio === 'cpf_cnpj' && valor.length === 14)
    ? '/consultar-cnpj'
    : '/consultar';

  const payload = { tipo, valor };
  console.log('▶︎ Enviando payload:', payload, '->', endpoint);

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload),
      cache: 'no-store'
    });
    const data = await res.json();
    console.log('◀︎ Resposta:', res.status, data);

    if (!res.ok) return notyf.error(data.erro || `Erro ${res.status}`);

    // long polling...
    if (data.aguardando) {
      tentativas++;
      if (!swalAberto) Swal.fire({ title:'Consultando...', allowOutsideClick:false, showConfirmButton:false, didOpen:()=>Swal.showLoading()}), swalAberto=true;
      if (tentativas < maxTentativas) return setTimeout(fazerConsulta, intervaloTentativas);
      Swal.close(); swalAberto=false; notyf.error('Timeout'); tentativas=0; return;
    }
    if (swalAberto) Swal.close(), swalAberto=false, tentativas=0;

    if (data.multiplos_cpfs) {
      // sua lógica de múltiplos...
      return;
    }

    preencherResultado(data);
  } catch(err) {
    console.error(err);
    if (swalAberto) Swal.close(), swalAberto=false;
    notyf.error('Erro de conexão');
  }
}

// Expõe para o HTML
window.aplicarMascara = aplicarMascara;
window.fazerConsulta   = fazerConsulta;
