// src/controllers/consultaMiddleware.js
import pool from '../db.js';

export const ConsultaPeople = async (req, res, next) => {
  const { tipo, valor } = req.body;
  if (!tipo || !valor) {
    return res.status(400).json({ erro: 'Preencha todos os campos' });
  }

  // 1) Mapeia o radio para a coluna correta
  const camposValidos = {
    cpf_cnpj:        'cpf_cnpj',
    nome_completo:   'nome_completo',
    numero_telefone: 'numero_telefone',
    email:           'email'
  };
  const campo = camposValidos[tipo];
  if (!campo) {
    return res.status(400).json({ erro: 'Tipo inválido' });
  }

  // 2) Se for CPF/CNPJ ou telefone, remove tudo que não seja dígito
  let v = valor;
  if (tipo === 'cpf_cnpj' || tipo === 'numero_telefone') {
    v = valor.replace(/\D/g, '');
  }

  try {
    // --- CASO CNPJ (14 dígitos) ---
    if (tipo === 'cpf_cnpj' && v.length === 14) {
      // 2.1) Busca dados da empresa
      const cnpjQ = `
        SELECT
          cnpj,
          razao_social,
          nome_fantasia,
          tipo,
          data_fundacao,
          situacao,
          cnae_numero,
          cnae_tipo,
          cnae_segmento,
          cnae_descricao,
          email,
          lead_id,
          renda,
          risco_credito
        FROM cnpj
        WHERE cnpj = $1
        LIMIT 1
      `;
      const { rows } = await pool.query(cnpjQ, [v]);
      if (rows.length === 0) {
        return res.status(404).json({ erro: 'CNPJ não encontrado' });
      }
      const c = rows[0];

      // 2.2) Busca o endereço concatenado
      const endQ = await pool.query(`
        SELECT
          endereco_rua || ', ' || bairro || ', ' || cidade || '/' || estado ||
          ' - CEP ' || cep AS endereco
        FROM endereco
        WHERE lead_id = $1
        LIMIT 1
      `, [c.lead_id]);
      const endereco = endQ.rows[0]?.endereco ?? '-';

      // 2.3) Placeholder para sociedade
      const sociedade = '-';

      // 2.4) Retorna JSON já com default `'-'` onde for null/undefined
      return res.json({
        cnpj:           c.cnpj           ?? '-',
        razao_social:   c.razao_social   ?? '-',
        nome_fantasia:  c.nome_fantasia  ?? '-',
        tipo:           c.tipo           ?? '-',
        data_fundacao:  c.data_fundacao  ?? '-',
        situacao:       c.situacao       ?? '-',
        cnae_numero:    c.cnae_numero    != null ? c.cnae_numero    : '-',
        cnae_tipo:      c.cnae_tipo      ?? '-',
        cnae_segmento:  c.cnae_segmento  ?? '-',
        cnae_descricao: c.cnae_descricao ?? '-',
        email:          c.email          ?? '-',
        renda:          c.renda          ?? '-',
        risco_credito:  c.risco_credito  ?? '-',
        endereco,
        sociedade
      });
    }

    // --- CASO CPF (11 dígitos) ou demais buscas ---
    if (tipo === 'cpf_cnpj' && v.length !== 11) {
      return res.status(400).json({ erro: 'CPF deve ter 11 dígitos' });
    }

    let lead, leadId;

    // 3) Busca por telefone
    if (campo === 'numero_telefone') {
      const telRes = await pool.query(`
        SELECT lead_id
        FROM lead_telefones
        WHERE numero_telefone = $1
      `, [v]);
      if (telRes.rows.length === 0) return next();
      if (telRes.rows.length > 1) {
        // múltiplos leads → devolve lista de CPFs
        const cpfs = await Promise.all(telRes.rows.map(async r => {
          const qr = await pool.query(`
            SELECT nome_completo,
                   TO_CHAR(data_nasc,'DD/MM/YYYY') AS data_nasc
            FROM lead
            WHERE lead_id = $1
            LIMIT 1
          `, [r.lead_id]);
          return {
            cpf:           qr.rows[0]?.nome_completo ? r.numero_telefone : '-',
            nome_completo: qr.rows[0]?.nome_completo ?? '-',
            data_nasc:     qr.rows[0]?.data_nasc      ?? '-'
          };
        }));
        return res.json({ multiplos_cpfs: true, dados: cpfs });
      }
      leadId = telRes.rows[0].lead_id;

    // 4) Busca por e-mail
    } else if (campo === 'email') {
      const emailRes = await pool.query(`
        SELECT l.*,
               TO_CHAR(l.data_nasc,'DD/MM/YYYY') AS data_nasc_formatada,
               o.descricao AS ocupacao
        FROM lead_emails le
        JOIN lead l ON l.lead_id = le.lead_id
        LEFT JOIN ocupacao o ON o.id_ocupacao = l.id_ocupacao
        WHERE le.email ILIKE $1
        LIMIT 1
      `, [`%${valor}%`]);
      if (emailRes.rows.length === 0) return next();
      lead   = emailRes.rows[0];
      leadId = lead.lead_id;

    // 5) Busca por CPF ou Nome
    } else {
      const col    = (tipo === 'cpf_cnpj') ? 'cpf_cnpj' : 'nome_completo';
      const params = (tipo === 'cpf_cnpj') ? [v] : [`%${valor}%`];
      const leadRes = await pool.query(`
        SELECT l.*,
               TO_CHAR(l.data_nasc,'DD/MM/YYYY') AS data_nasc_formatada,
               o.descricao AS ocupacao
        FROM lead l
        LEFT JOIN ocupacao o ON o.id_ocupacao = l.id_ocupacao
        WHERE ${col} ILIKE $1
        LIMIT 1
      `, params);
      if (leadRes.rows.length === 0) return next();
      lead   = leadRes.rows[0];
      leadId = lead.lead_id;
    }

    // --- Telefones: traz numero & situacao ---
    const t2 = await pool.query(`
      SELECT numero_telefone,
             situacao
      FROM lead_telefones
      WHERE lead_id = $1
    `, [leadId]);
    const telefones = t2.rows.map(r => ({
      numero:   r.numero_telefone ?? '-',
      situacao: r.situacao       ?? '-'
    }));

    // --- E-mails ---
    const e2 = await pool.query(
      'SELECT email FROM lead_emails WHERE lead_id = $1',
      [leadId]
    );
    const emails = e2.rows.map(r => r.email ?? '-');

    // --- Parentes: cpf, nome e grau ---
    const p2 = await pool.query(`
      SELECT pl.cpf_cnpj_parente,
             l.nome_completo  AS nome_parente,
             pl.grau_parentesco
        FROM possiveis_leads pl
   LEFT JOIN lead l
          ON l.cpf_cnpj = pl.cpf_cnpj_parente
       WHERE pl.lead_id = $1
    `, [leadId]);
    const parentes = p2.rows.map(r => ({
      nome_parente: r.nome_parente       ?? '-',
      cpf_parente:  r.cpf_cnpj_parente   ?? '-',
      grau:         r.grau_parentesco    ?? '-'
    }));

    // --- Endereço concatenado ---
    const endr = await pool.query(`
      SELECT endereco_rua || ', ' || bairro || ', ' || cidade || '/' || estado ||
             ' - CEP ' || cep AS endereco
      FROM endereco
      WHERE lead_id = $1
      LIMIT 1
    `, [leadId]);
    const endereco = endr.rows[0]?.endereco ?? '-';

    // --- Placeholder Sociedade ---
    const sociedade = '-';

    // --- Retorna JSON final para pessoa física ---
    return res.json({
      cpf:           lead.cpf_cnpj            ?? '-',
      nome_completo: lead.nome_completo       ?? '-',
      data_nasc:     lead.data_nasc_formatada ?? '-',
      sexo:          (lead.sexo === 'M'   ? 'Masculino'
                       : lead.sexo === 'F' ? 'Feminino'
                                            : '-'),
      nome_mae:      lead.nome_mae            ?? '-',
      falecido:      lead.falecido ? 'SIM' : 'NÃO',
      ocupacao:      lead.ocupacao            ?? '-',
      telefones,    // [ { numero, situacao }, … ]
      emails,       // [ string, … ]
      parentes,     // [ { nome_parente, cpf_parente, grau }, … ]
      renda:         lead.renda               ?? '-',
      risco_credito: lead.risco_credito       ?? '-',
      endereco,
      sociedade
    });

  } catch (err) {
    console.error('❌ Erro ao consultar dados completos:', err);
    return res.status(500).json({ erro: 'Erro interno do servidor' });
  }
};
