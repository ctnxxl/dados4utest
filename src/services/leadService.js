// src/leadService.js

import pool from '../db.js';

export async function fetchLeadData(tipo, valor) {
  // ... (o início da função com mapCampos e valorLimpo permanece igual)
  const mapCampos = { cpf_cnpj: 'cpf_cnpj', nome_completo: 'nome_completo', numero_telefone: 'numero_telefone', email: 'email' };
  const coluna = mapCampos[tipo];
  if (!coluna) { return null; }
  const valorLimpo = ['cpf_cnpj', 'numero_telefone'].includes(tipo) ? valor.replace(/\D/g, '') : valor;

  try {
    let sql, params;

    // 👇 A MUDANÇA COMEÇA AQUI 👇
    if (tipo === 'numero_telefone') {
      // 1. Buscamos TODOS os leads associados ao telefone, SEM o LIMIT 1
      const buscaTelefoneSql = `
        SELECT l.cpf_cnpj, l.nome_completo
          FROM lead_telefones lt
          JOIN lead l ON l.lead_id = lt.lead_id
         WHERE lt.numero_telefone = $1`;
      
      const { rows } = await pool.query(buscaTelefoneSql, [valorLimpo]);

      if (rows.length === 0) {
        return null; // Nenhum CPF encontrado, segue para a fila priority
      }

      if (rows.length > 1) {
        // Múltiplos CPFs encontrados! Retorna um objeto especial para o frontend decidir.
        console.log(`[Busca] Múltiplos CPFs encontrados para o telefone ${valorLimpo}`);
        return { multiplos_cpfs: rows }; 
      }

      // Se encontrou APENAS 1 CPF, o 'valorLimpo' para a próxima busca será esse CPF.
      // Isso nos permite reutilizar a lógica de busca por CPF.
      tipo = 'cpf_cnpj'; // Forçamos o tipo para cpf_cnpj
      valor = rows[0].cpf_cnpj; // Pegamos o único CPF encontrado
    }
    
    // 2. Lógica de busca principal (reutilizada para CPF único ou busca direta)
    const buscaPrincipalSql = `
      SELECT l.*, o.descricao AS ocupacao
        FROM lead l
        LEFT JOIN ocupacao o ON o.id_ocupacao = l.id_ocupacao
       WHERE l.${tipo === 'email' ? 'email' : 'cpf_cnpj'} ${tipo === 'email' ? 'ILIKE' : '='} $1
       LIMIT 1`;
    
    params = [tipo === 'email' ? `%${valor}%` : valor];

    const { rows: leadRows } = await pool.query(buscaPrincipalSql, params);

    if (leadRows.length === 0) {
      return null;
    }

    const lead = leadRows[0];
    const leadId = lead.lead_id;

    // Monta detalhes adicionais
    const [telQ, emQ, parQ, endQ] = await Promise.all([
      pool.query(`SELECT numero_telefone AS numero, situacao FROM lead_telefones WHERE lead_id = $1`, [leadId]),
      pool.query(`SELECT email FROM lead_emails WHERE lead_id = $1`, [leadId]),
      pool.query(
        `SELECT pl.cpf_cnpj_parente AS cpf_parente, l2.nome_completo AS nome_parente, pl.grau_parentesco AS grau
           FROM possiveis_leads pl
      LEFT JOIN lead l2 ON l2.cpf_cnpj = pl.cpf_cnpj_parente
          WHERE pl.lead_id = $1`,
        [leadId]
      ),
      pool.query(
        `SELECT endereco_rua || ', ' || bairro || ', ' || cidade || '/' || estado || ' - CEP ' || cep AS endereco
           FROM endereco
          WHERE lead_id = $1
          LIMIT 1`,
        [leadId]
      )
    ]);
    
    // Formata e retorna o objeto de dados final
    return {
      cpf:           lead.cpf_cnpj           ?? '-',
      nome_completo: lead.nome_completo      ?? '-',
      data_nasc:     lead.data_nasc_formatada?? '-',
      sexo:          lead.sexo === 'M' ? 'Masculino' : lead.sexo === 'F' ? 'Feminino' : '-',
      nome_mae:      lead.nome_mae           ?? '-',
      falecido:      lead.falecido           ? 'SIM' : 'NÃO',
      ocupacao:      lead.ocupacao           ?? '-',
      telefones:     telQ.rows.map(r => ({ numero: r.numero ?? '-', situacao: r.situacao ?? '-' })),
      emails:        emQ.rows.map(r => r.email ?? '-'),
      parentes:      parQ.rows.map(r => ({ nome_parente: r.nome_parente ?? '-', cpf_parente: r.cpf_parente ?? '-', grau: r.grau ?? '-' })),
      endereco:      endQ.rows[0]?.endereco  ?? '-',
      sociedade:     '-' 
    };

  } catch (err) {
    console.error('❌ Erro em fetchLeadData:', err);
    // Lança o erro para que o chamador possa tratá-lo.
    throw err;
  }
}