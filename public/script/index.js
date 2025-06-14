// public/js/index.js

import { carregarNomeDoUsuario } from "./carregaUser.js";

const notyf = new Notyf();
const token = localStorage.getItem('token');

// ───────────────────────────────────────────────────────
// FUNÇÕES DE AJUDA E FORMATAÇÃO
// ───────────────────────────────────────────────────────
function formatCPF(cpf) {
    const v = (cpf || '').toString().replace(/\D/g, '').padEnd(11, '0').slice(0, 11);
    return v
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

function formatTelefone(tel) {
    const v = (tel || '').toString().replace(/\D/g, '');
    if (v.length === 11) return v.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
    if (v.length === 10) return v.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3');
    return tel || '-';
}

function aplicarMascara(input) {
    const tipo = document.querySelector('input[name="tipo"]:checked').value;
    if (tipo === 'cpf_cnpj') maskCpfCnpj(input);
    else if (tipo === 'numero_telefone') maskTelefone(input);
}

function maskCpfCnpj(input) {
    let v = input.value.replace(/\D/g, '').slice(0, 14);
    if (v.length <= 11) {
        v = v.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    } else {
        v = v.replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2');
    }
    input.value = v;
}

function maskTelefone(input) {
    let v = input.value.replace(/\D/g, '').slice(0, 11);
    if (v.length >= 11) v = v.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
    else if (v.length >= 10) v = v.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3');
    else if (v.length >= 6) v = v.replace(/^(\d{2})(\d{4,})$/, '($1) $2');
    else if (v.length >= 3) v = v.replace(/^(\d{2})(\d{0,})$/, '($1) $2');
    input.value = v;
}

// ───────────────────────────────────────────────────────
// FUNÇÕES PRINCIPAIS
// ───────────────────────────────────────────────────────

function preencherResultado(data) {
    const grid = document.querySelector('.result-grid');
    grid.classList.remove('ocultar-detalhes');
    grid.style.display = 'grid';
    grid.innerHTML = '';

    if (data.cnpj) {
        // ...
        return;
    }

    const tableStyle = `style="border-collapse: collapse; width: 100%; table-layout: fixed;"`;    const thStyle = `style="text-align: left; padding: 4px 8px;"`;
    const tdStyle = `style="padding: 4px 8px; vertical-align: top; white-space: nowrap;"`;

    grid.innerHTML = `
        <div class="label">CPF</div><div class="value">${formatCPF(data.cpf)}</div>
        <div class="label">Nome Completo</div><div class="value">${data.nome_completo ?? '-'}</div>
        <div class="label">Data Nasc.</div><div class="value">${data.data_nasc ?? '-'}</div>
        <div class="label">Sexo</div><div class="value">${data.sexo ?? '-'}</div>
        <div class="label">Nome Mãe</div><div class="value">${data.nome_mae ?? '-'}</div>
        <div class="label">Falecido?</div><div class="value">${data.falecido ?? '-'}</div>
        <div class="label">Ocupação</div><div class="value">${data.ocupacao ?? '-'}</div>
        <div class="label">E-mail</div><div class="value">${data.email ?? '-'}</div>
        <div class="label">Telefones</div>
        <div class="value" style="overflow-x: auto;"><table ${tableStyle}><thead><tr><th ${thStyle}>Número</th><th ${thStyle}>Situação</th></tr></thead><tbody>${data.telefones?.length > 0 ? data.telefones.map(tel => `<tr><td ${tdStyle}>${formatTelefone(tel.numero)}</td><td ${tdStyle}>${tel.situacao}</td></tr>`).join('') : `<tr><td ${tdStyle}>-</td><td ${tdStyle}>-</td></tr>`}</tbody></table></div>
        <div class="label">Parentes</div>
        <div class="value" style="overflow-x: auto;"><table ${tableStyle}><thead><tr><th ${thStyle}>Nome Parente</th><th ${thStyle}>CPF</th><th ${thStyle}>Grau Parentesco</th></tr></thead><tbody>${data.parentes?.length > 0 ? data.parentes.map(p => `<tr><td ${tdStyle}>${p.nome_parente ?? '-'}</td><td ${tdStyle}>${p.cpf_parente ?? '-'}</td><td ${tdStyle}>${p.grau ?? '-'}</td></tr>`).join('') : `<tr><td ${tdStyle}>-</td><td ${tdStyle}>-</td><td ${tdStyle}>-</td></tr>`}</tbody></table></div>
        <div class="label">Renda</div><div class="value">${data.renda ?? '-'}</div>
        <div class="label">Risco de Crédito</div><div class="value">${data.risco_credito ?? '-'}</div>
        <div class="label">Endereço</div><div class="value">${data.endereco ?? '-'}</div>
        ${data.sociedade && data.sociedade.length > 0 ? `<div class="label">Sociedade</div><div class="value" style="overflow-x: auto;"><table ${tableStyle}><thead><tr><th style="text-align: left; padding: 4px 8px; width: 50%;">Nome</th><th style="text-align: left; padding: 4px 8px; width: 30%;">CNPJ</th><th style="text-align: left; padding: 4px 8px; width: 20%;">Participação</th></tr></thead><tbody>${data.sociedade.map(s => `<tr><td ${tdStyle}>${s.razao_social ?? '-'}</td><td ${tdStyle}>${s.cnpj ?? '-'}</td><td ${tdStyle}>${s.participacao ?? '-'}</td></tr>`).join('')}</tbody></table></div>` : `<div class="label">Sociedade</div><div class="value">-</div>`}
    `;
}

async function fazerConsulta(payloadOverride = null) {
    let payload;
    if (payloadOverride) {
        payload = payloadOverride;
    } else {
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
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (Swal.isVisible()) Swal.close();

        if (!res.ok) {
            return Swal.fire({ icon: 'error', title: data.erro || 'Erro', text: `Status: ${res.status}` });
        }

        if (data.multiplos_cpfs) {
            const inputOptions = {};
            data.multiplos_cpfs.forEach(item => { inputOptions[item.cpf_cnpj] = `${item.nome_completo} (${item.cpf_cnpj})`; });
            const { value: cpfEscolhido } = await Swal.fire({
                title: 'Múltiplos resultados encontrados',
                text: 'Este telefone está associado a mais de um CPF. Por favor, selecione o correto:',
                input: 'radio',
                inputOptions,
                inputValidator: (value) => !value && 'Você precisa escolher uma opção!'
            });
            if (cpfEscolhido) fazerConsulta({ tipo: 'cpf_cnpj', valor: cpfEscolhido });
            return;
        }
        preencherResultado(data);
    } catch (err) {
        if (Swal.isVisible()) Swal.close();
        console.error('❌ Erro na consulta:', err);
        notyf.error('Erro de conexão ou falha na consulta.');
    }
}

// ───────────────────────────────────────────────────────
// INICIALIZAÇÃO E EVENTOS
// ───────────────────────────────────────────────────────

if (!token) {
    window.location.replace('/login');
} else {
    fetch('/api/user/me', { headers: { Authorization: 'Bearer ' + token } })
        .then(res => {
            if (res.status === 401 || res.status === 403) {
                localStorage.removeItem('token');
                window.location.replace('/login');
            }
            return res.ok ? res.json() : Promise.reject(res);
        })
        .then(data => {
            if (data?.username) document.getElementById('user-name').textContent = `Olá, ${data.username}`;
        })
        .catch(() => {
            localStorage.removeItem('token');
            window.location.replace('/login');
        });
}
carregarNomeDoUsuario();

const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = '/login?t=' + Date.now();
    });
}
const adminBtn = document.getElementById('adminBtn');
if (adminBtn) adminBtn.addEventListener('click', () => window.location.replace('/admin-panel'));

const searchInput = document.getElementById('valor');
if (searchInput) {
    searchInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            fazerConsulta();
            setTimeout(() => { location.href = '#resultado'; }, 300);
        }
    });
    searchInput.addEventListener('input', () => aplicarMascara(searchInput));
}

window.aplicarMascara = aplicarMascara;