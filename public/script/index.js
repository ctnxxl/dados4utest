// public/js/index.js
import { carregarNomeDoUsuario } from "./carregaUser.js";

const notyf = new Notyf();

// 0) Verifica se o token existe e é válido
const token = localStorage.getItem('token');
if (!token) {
  window.location.replace('/login');
} else {
  fetch('/api/user/me', { headers: { Authorization: 'Bearer ' + token } })
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

// ───────────────────────────────────────────────────────
// Máscaras p/ formatação de CPF e telefone ao exibir dados
function formatCPF(cpf) {
  const v = (cpf || '').toString().replace(/\D/g, '').padEnd(11, '0').slice(0, 11);
  return v
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

function formatTelefone(tel) {
  const v = (tel || '').toString().replace(/\D/g, '');
  if (v.length === 11) {
    return v.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
  }
  if (v.length === 10) {
    return v.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3');
  }
  return tel || '-';
}
// ───────────────────────────────────────────────────────

// Aplica máscara enquanto digita
function aplicarMascara(input) {
  const tipo = document.querySelector('input[name="tipo"]:checked').value;
  if (tipo === 'cpf_cnpj') maskCpfCnpj(input);
  else if (tipo === 'numero_telefone') maskTelefone(input);
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
  if (swalAberto) Swal.close(), swalAberto = false;

  const grid = document.querySelector('.result-grid');
  grid.classList.remove('ocultar-detalhes');
  grid.style.display = 'grid';
  grid.innerHTML = '';

  // ─── Bloco CNPJ ────────────────────────────────────────
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
    const tableStyle = `style="width: 100%; border-collapse: collapse;"`;
    const thStyle = `style="text-align: left; padding: 4px 0;"`;
    const tdStyle = `style="padding: 4px 0; vertical-align: top;"`;
  // ─── Bloco CPF/PESSOA (campos fixos) ────────────────────
  grid.innerHTML = `
    <div class="label">CPF</div><div class="value">${formatCPF(data.cpf)}</div>
    <div class="label">Nome Completo</div><div class="value">${data.nome_completo ?? '-'}</div>
    <div class="label">Data Nasc.</div><div class="value">${data.data_nasc ?? '-'}</div>
    <div class="label">Sexo</div><div class="value">${data.sexo ?? '-'}</div>
    <div class="label">Nome Mãe</div><div class="value">${data.nome_mae ?? '-'}</div>
    <div class="label">Falecido?</div><div class="value">${data.falecido ?? '-'}</div>
    <div class="label">Ocupação</div><div class="value">${data.ocupacao ?? '-'}</div>
    <div class="label">E-mail</div><div class="value">${data.email ?? '-'}</div> <div class="label">Telefones</div>
    <div class="value">
      <table ${tableStyle}>
        <thead>
          <tr>
            <th ${thStyle} style="width: 150px;">Número</th>
            <th ${thStyle}>Situação</th>
          </tr>
        </thead>
        <tbody>
          ${
            data.telefones?.length > 0
              ? data.telefones.map(tel => `
                  <tr>
                    <td ${tdStyle}>${tel.numero}</td>
                    <td ${tdStyle}>${tel.situacao}</td>
                  </tr>
                `).join('')
              : `<tr><td ${tdStyle}>-</td><td ${tdStyle}>-</td></tr>`
          }
        </tbody>
      </table>
    </div>

    <div class="label">Parentes</div>
    <div class="value">
      <table ${tableStyle}>
        <thead>
          <tr>
            <th ${thStyle}>Nome Parente</th>
            <th ${thStyle}>CPF</th>
            <th ${thStyle}>Grau Parentesco</th>
          </tr>
        </thead>
        <tbody>
          ${
            data.parentes?.length > 0
              ? data.parentes.map(p => `
                  <tr>
                    <td ${tdStyle}>${p.nome ?? '-'}</td>
                    <td ${tdStyle}>${p.cpf ?? '-'}</td>
                    <td ${tdStyle}>${p.grau ?? '-'}</td>
                  </tr>
                `).join('')
              : `<tr><td ${tdStyle}>-</td><td ${tdStyle}>-</td><td ${tdStyle}>-</td></tr>`
          }
        </tbody>
      </table>
    </div>

    <div class="label">Renda</div><div class="value">${data.renda ?? '-'}</div>
    <div class="label">Risco de Crédito</div><div class="value">${data.risco_credito ?? '-'}</div>
    <div class="label">Endereço</div><div class="value">${data.endereco ?? '-'}</div>
    <div class="label">Sociedade</div><div class="value">${data.sociedade ?? '-'}</div>
  `;

  // (tabelas omitidas por brevidade...)
}

// ───────────────────────────────────────────────────────
// Função principal de consulta
// public/js/index.js

// public/js/index.js

// public/js/index.js

async function fazerConsulta(payloadOverride = null) {
  let payload;

  if (payloadOverride) {
    // Usado para a segunda consulta (quando o usuário escolhe um CPF)
    payload = payloadOverride;
  } else {
    // Consulta inicial feita pelo usuário
    const raw = document.getElementById('valor').value.trim();
    const radio = document.querySelector('input[name="tipo"]:checked').value;
    const valor = (radio === 'cpf_cnpj' || radio === 'numero_telefone') ? raw.replace(/\D/g, '') : raw;
    payload = { tipo: radio, valor };
  }
  
  const endpoint = (payload.tipo === 'cpf_cnpj' && payload.valor.length === 14) ? '/consultar-cnpj' : '/consultar';

  Swal.fire({
    title: 'Consultando...',
    text: 'Isso pode levar alguns segundos.',
    allowOutsideClick: false,
    showConfirmButton: false,
    didOpen: () => Swal.showLoading()
  });

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    Swal.close();

    if (!res.ok) {
      return Swal.fire({ icon: 'error', title: data.erro || 'Erro', text: `Status: ${res.status}` });
    }

    // 👇 AQUI ESTÁ A NOVA LÓGICA PARA MÚLTIPLOS CPFS 👇
    if (data.multiplos_cpfs) {
      // Transforma o array de CPFs em um objeto para o SweetAlert
      const inputOptions = {};
      data.multiplos_cpfs.forEach(item => {
        inputOptions[item.cpf_cnpj] = `${item.nome_completo} (${item.cpf_cnpj})`;
      });

      const { value: cpfEscolhido } = await Swal.fire({
        title: 'Múltiplos resultados encontrados',
        text: 'Este telefone está associado a mais de um CPF. Por favor, selecione o correto:',
        input: 'radio',
        inputOptions: inputOptions,
        inputValidator: (value) => {
          if (!value) {
            return 'Você precisa escolher uma opção!'
          }
        }
      });

      if (cpfEscolhido) {
        // Se o usuário escolheu um CPF, fazemos uma nova consulta automática por aquele CPF
        fazerConsulta({ tipo: 'cpf_cnpj', valor: cpfEscolhido });
      }
      return; // Encerra a execução desta chamada
    }

    // Se não for o caso de múltiplos CPFs, exibe o resultado final
    preencherResultado(data);

  } catch (err) {
    Swal.close();
    console.error('❌ Erro na consulta:', err);
    notyf.error('Erro de conexão ou falha na consulta.');
  }
}

// Expõe para o HTML
window.aplicarMascara = aplicarMascara;
window.fazerConsulta   = fazerConsulta;
