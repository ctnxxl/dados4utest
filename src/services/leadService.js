// src/leadService.js

import pool from '../db.js';

export async function fetchLeadData(tipo, valor) {
  const mapCampos = { cpf_cnpj: 'cpf_cnpj', nome_completo: 'nome_completo', numero_telefone: 'numero_telefone', email: 'email' };
  const coluna = mapCampos[tipo];
  if (!coluna) { return null; }
  const valorLimpo = ['cpf_cnpj', 'numero_telefone'].includes(tipo) ? valor.replace(/\D/g, '') : valor;

  try {
    let sql, params;
    let tipoBuscaFinal = tipo;
    let valorBuscaFinal = valorLimpo;

    // --- LÓGICA CORRIGIDA ---

    if (tipo === 'numero_telefone') {
      const buscaTelefoneSql = `
        SELECT l.cpf_cnpj, l.nome_completo
          FROM lead_telefones lt
          JOIN lead l ON l.lead_id = lt.lead_id
         WHERE lt.numero_telefone = $1`;
      
      const { rows } = await pool.query(buscaTelefoneSql, [valorLimpo]);

      if (rows.length === 0) return null;
      if (rows.length > 1) return { multiplos_cpfs: rows };

      // Se encontrou só 1, preparamos para a busca final por CPF
      tipoBuscaFinal = 'cpf_cnpj';
      valorBuscaFinal = rows[0].cpf_cnpj;
    
    } else if (tipo === 'email') { // <-- NOVO BLOCO PARA TRATAR E-MAIL
      const buscaEmailSql = `
        SELECT l.cpf_cnpj, l.nome_completo
          FROM lead_emails le
          JOIN lead l ON l.lead_id = le.lead_id
         WHERE le.email ILIKE $1`;
      
      const { rows } = await pool.query(buscaEmailSql, [`%${valorLimpo}%`]);

      if (rows.length === 0) return null;
      if (rows.length > 1) return { multiplos_cpfs: rows };
      
      // Se encontrou só 1, preparamos para a busca final por CPF
      tipoBuscaFinal = 'cpf_cnpj';
      valorBuscaFinal = rows[0].cpf_cnpj;
    }
    
    // --- LÓGICA DE BUSCA PRINCIPAL (AGORA SIMPLIFICADA) ---
    // Esta busca agora só precisa se preocupar com cpf_cnpj ou nome_completo
    const buscaPrincipalSql = `
      SELECT l.*, o.descricao AS ocupacao,
          TO_CHAR(l.data_nasc, 'DD/MM/YYYY') AS data_nasc_formatada
        FROM lead l
        LEFT JOIN ocupacao o ON o.id_ocupacao = l.id_ocupacao
       WHERE l.${tipoBuscaFinal === 'nome_completo' ? 'nome_completo' : 'cpf_cnpj'} ${tipoBuscaFinal === 'nome_completo' ? 'ILIKE' : '='} $1
       LIMIT 1`;
    
    params = [tipoBuscaFinal === 'nome_completo' ? `%${valorBuscaFinal}%` : valorBuscaFinal];

    const { rows: leadRows } = await pool.query(buscaPrincipalSql, params);

    if (leadRows.length === 0) return null;

    const lead = leadRows[0];
    // 👇 Adicione este log para resolvermos o problema dos campos que não aparecem 👇
    console.log('DEBUG: Objeto "lead" cru recebido do banco:', lead);
    
    const leadId = lead.lead_id;

    // ... (O restante do código com Promise.all e o return final permanece o mesmo)
    const [telQ, emQ, parQ, endQ] = await Promise.all([
        pool.query(`SELECT numero_telefone AS numero, situacao FROM lead_telefones WHERE lead_id = $1`, [leadId]),
        pool.query(`SELECT email FROM lead_emails WHERE lead_id = $1`, [leadId]),
        pool.query(`SELECT pl.cpf_cnpj_parente AS cpf_parente, l2.nome_completo AS nome_parente, pl.grau_parentesco AS grau FROM possiveis_leads pl LEFT JOIN lead l2 ON l2.cpf_cnpj = pl.cpf_cnpj_parente WHERE pl.lead_id = $1`,[leadId]),
        pool.query(`SELECT endereco_rua || ', ' || bairro || ', ' || cidade || '/' || estado || ' - CEP ' || cep AS endereco FROM endereco WHERE lead_id = $1 LIMIT 1`,[leadId])
    ]);
    
    return {
      cpf:           lead.cpf_cnpj           ?? '-',
      nome_completo: lead.nome_completo      ?? '-',
      data_nasc:     lead.data_nasc_formatada ?? '-',
      sexo:          lead.sexo === 'M' ? 'Masculino' : lead.sexo === 'F' ? 'Feminino' : '-',
      nome_mae:      lead.nome_mae           ?? '-',
      falecido:      lead.falecido           ? 'SIM' : 'NÃO',
      ocupacao:      lead.ocupacao           ?? '-',
      email:         emQ.rows[0]?.email      ?? '-',
      telefones:     telQ.rows.map(r => ({ numero: r.numero ?? '-', situacao: r.situacao ?? '-' })),
      parentes:      parQ.rows.map(r => ({ nome_parente: r.nome_parente ?? '-', cpf_parente: r.cpf_parente ?? '-', grau: r.grau ?? '-' })),
      endereco:      endQ.rows[0]?.endereco  ?? '-',
      renda:         lead.renda              ?? '-',
      risco_credito: lead.risco_credito      ?? '-',
      sociedade:     '-' 
    };

  } catch (err) {
    console.error('❌ Erro em fetchLeadData:', err);
    throw err;
  }
}