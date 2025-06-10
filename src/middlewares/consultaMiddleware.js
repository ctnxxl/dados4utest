import pool from '../db.js';

export const ConsultaPeople = async (req, res, next) => {
  const { tipo, valor } = req.body;

  if (!tipo || !valor) {
    return res.status(400).json({ erro: 'Preencha todos os campos' });
  }

  // O objeto “camposValidos” deve corresponder exatamente aos value dos seus radios no HTML:
  //   value="cpf_cnpj", value="nome_completo", value="numero_telefone", value="email"
  const camposValidos = {
    cpf_cnpj       : 'cpf_cnpj',        // coluna do lead
    nome_completo  : 'nome_completo',   // coluna do lead
    numero_telefone: 'numero_telefone', // coluna do lead_telefones
    email          : 'email'            // coluna do lead_emails
  };
  const campo = camposValidos[tipo];
  if (!campo) {
    return res.status(400).json({ erro: 'Tipo inválido' });
  }

  try {
    let lead;
    let leadId;

    if (campo === 'numero_telefone') {
      // Busca na tabela lead_telefones pela coluna `numero_telefone`
      const telQuery = `
        SELECT lead.cpf_cnpj, lead.lead_id
        FROM lead
        INNER JOIN lead_telefones ON lead.lead_id = lead_telefones.lead_id
        WHERE lead_telefones.numero_telefone = $1
      `;
      const telResult = await pool.query(telQuery, [valor]);

      if (telResult.rows.length === 0) {
        // Não encontrou → passa para o next() (priority)
        return next();
      }
      if (telResult.rows.length > 1) {
        // Se houver múltiplos leads para o mesmo telefone, devolve a lista de CPFs
        const cpfsComDados = [];
        for (const row of telResult.rows) {
          const result = await pool.query(`
            SELECT nome_completo,
                   TO_CHAR(data_nasc, 'DD/MM/YYYY') AS data_nasc_formatada
            FROM lead
            WHERE lead_id = $1
            LIMIT 1
          `, [row.lead_id]);

          cpfsComDados.push({
            cpf          : row.cpf_cnpj || '-',
            nome_completo: result.rows[0]?.nome_completo || '-',
            data_nasc    : result.rows[0]?.data_nasc_formatada || '-'
          });
        }
        return res.json({ multiplos_cpfs: true, dados: cpfsComDados });
      }

      // Encontrou exatamente um lead
      leadId = telResult.rows[0].lead_id;
      const leadQuery = `
        SELECT lead.*,
               TO_CHAR(lead.data_nasc, 'DD/MM/YYYY') AS data_nasc_formatada,
               ocupacao.descricao AS ocupacao
        FROM lead
        LEFT JOIN ocupacao ON ocupacao.id_ocupacao = lead.id_ocupacao
        WHERE lead.lead_id = $1
        LIMIT 1
      `;
      const result = await pool.query(leadQuery, [leadId]);
      lead = result.rows[0];

    } else if (campo === 'email') {
      // Busca na lead_emails (partial match)
      const emailQuery = `
        SELECT lead.*,
               TO_CHAR(lead.data_nasc, 'DD/MM/YYYY') AS data_nasc_formatada,
               ocupacao.descricao AS ocupacao
        FROM lead
        INNER JOIN lead_emails ON lead.lead_id = lead_emails.lead_id
        LEFT JOIN ocupacao ON ocupacao.id_ocupacao = lead.id_ocupacao
        WHERE lead_emails.email ILIKE $1
        LIMIT 1
      `;
      const result = await pool.query(emailQuery, [`%${valor}%`]);
      if (result.rows.length === 0) {
        return next();
      }
      lead   = result.rows[0];
      leadId = lead.lead_id;

    } else {
      // Busca por CPF/CNPJ ou Nome (partial match para nome)
      const leadQuery = `
        SELECT lead.*,
               TO_CHAR(lead.data_nasc, 'DD/MM/YYYY') AS data_nasc_formatada,
               ocupacao.descricao AS ocupacao
        FROM lead
        LEFT JOIN ocupacao ON ocupacao.id_ocupacao = lead.id_ocupacao
        WHERE ${campo} ILIKE $1
        LIMIT 1
      `;
      const result = await pool.query(leadQuery, [`%${valor}%`]);
      if (result.rows.length === 0) {
        return next();
      }
      lead   = result.rows[0];
      leadId = lead.lead_id;
    }

    // Se chegou até aqui, encontramos um único lead. Agora trazemos telefones, emails e parentes:
    const telResult = await pool.query(
      'SELECT numero_telefone FROM lead_telefones WHERE lead_id = $1',
      [leadId]
    );
    const telefones = telResult.rows.map(r => r.numero_telefone);

    const emailResult = await pool.query(
      'SELECT email FROM lead_emails WHERE lead_id = $1',
      [leadId]
    );
    const emails = emailResult.rows.map(r => r.email);

    const parentesResult = await pool.query(
      'SELECT cpf_cnpj_parente, grau_parentesco FROM possiveis_leads WHERE lead_id = $1',
      [leadId]
    );
    const parentes = parentesResult.rows.map(p => `${p.cpf_cnpj_parente} (${p.grau_parentesco})`);

    return res.json({
      cpf          : lead.cpf_cnpj,
      nome_completo: lead.nome_completo,
      data_nasc    : lead.data_nasc_formatada,
      sexo         : lead.sexo === 'M' ? 'Masculino'
                   : lead.sexo === 'F' ? 'Feminino'
                   : 'N/A',
      nome_mae : lead.nome_mae,
      falecido: lead.falecido ? 'SIM' : 'NÃO',
      ocupacao: lead.ocupacao || '-',
      telefones,
      emails,
      parentes
    });

  } catch (err) {
    console.error('❌ Erro ao consultar dados completos:', err);
    return res.status(500).json({ erro: 'Erro interno do servidor' });
  }
};
