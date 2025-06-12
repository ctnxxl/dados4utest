// src/controllers/consultaCnpjController.js
import pool from '../db.js';

export async function consultarCnpj(req, res) {
  const { valor: cnpj } = req.body;
  if (!cnpj) {
    return res.status(400).json({ erro: 'CNPJ não fornecido' });
  }

  try {
    const query = `
      SELECT
        cnpj,
        razao_social,
        nome_fantasia,
        tipo,
        TO_CHAR(data_fundacao, 'YYYY-MM-DD') AS data_fundacao,
        situacao,
        cnae_numero,
        cnae_tipo,
        cnae_segmento,
        cnae_descricao,
        email,
        lead_id
      FROM cnpj
      WHERE cnpj = $1
      LIMIT 1
    `;
    const result = await pool.query(query, [cnpj]);

    if (result.rows.length === 0) {
      return res.status(404).json({ erro: 'CNPJ não encontrado' });
    }

    return res.json(result.rows[0]);
  } catch (err) {
    console.error('Erro em consultarCnpj:', err);
    return res.status(500).json({ erro: 'Erro interno no servidor' });
  }
}
