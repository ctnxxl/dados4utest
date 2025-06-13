// src/middlewares/priorityMiddleware.js

import pool from '../db.js';
import { fetchLeadData } from '../services/leadService.js';

const MAX_RETRIES = 10;
const RETRY_INTERVAL_MS = 3000;

export const priority = async (req, res, next) => {
  // 👇 A CORREÇÃO ESTÁ AQUI: trocamos 'const' por 'let' 👇
  let { tipo, valor } = req.body;

  if (tipo === 'cpf_cnpj' || tipo === 'numero_telefone') {
    // Agora esta linha funciona, pois 'valor' pode ser modificado
    valor = valor.trim().replace(/\D/g, '');
  } else {
    valor = valor.trim();
  }

  const colunaMap = { cpf_cnpj: 'cpf_cnpj', numero_telefone: 'telefone', email: 'email', nome_completo: 'nome' };
  const coluna = colunaMap[tipo];

  try {
    await pool.query(`INSERT INTO priority (${coluna}, processado, erro) SELECT $1, false, false WHERE NOT EXISTS (SELECT 1 FROM priority WHERE ${coluna} = $1);`, [valor]);
  } catch (err) {
    console.error('❌ Erro ao inserir na fila de prioridade:', err);
    return res.status(500).json({ erro: 'Falha ao iniciar processamento em fila.' });
  }

  let attempts = 0;

  const checkStatus = async () => {
    attempts++;
    if (attempts > MAX_RETRIES) { return res.status(504).json({ erro: 'Timeout: O processamento da sua consulta demorou demais.' }); }

    try {
      const { rows } = await pool.query(`SELECT processado, erro FROM priority WHERE ${coluna} = $1 ORDER BY id DESC LIMIT 1`, [valor]);
      if (rows.length === 0) { return res.status(500).json({ erro: 'Tarefa não encontrada na fila.' }); }

      const { processado, erro } = rows[0];

      if (erro === true) { return res.status(500).json({ erro: 'Falha no processamento da fila' }); }

      if (processado === true) {
        console.log(`[Fila] Processamento concluído para '${valor}'. Buscando dados finais...`);
        const finalData = await fetchLeadData(tipo, valor);
        if (finalData) {
          return res.json(finalData);
        } else {
          return res.status(404).json({ erro: 'Dados processados não foram encontrados.' });
        }
      }

      setTimeout(checkStatus, RETRY_INTERVAL_MS);

    } catch (dbErr) {
      console.error('❌ Erro ao verificar status da fila:', dbErr);
      return res.status(500).json({ erro: 'Erro interno ao consultar fila.' });
    }
  };

  checkStatus();
};