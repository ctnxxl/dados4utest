import pool from '../db.js';

/**
 * priorityMiddleware:
 * - Recebe { tipo, valor } do front-end
 * - Remove máscara (somente dígitos) se for CPF ou Telefone
 * - Usa o próprio `tipo` para decidir em qual coluna inserir:
 *      * tipo === 'cpf_cnpj'       → insere em cpf_cnpj
 *      * tipo === 'numero_telefone'→ insere em telefone      ← IMPORTANTE
 *      * tipo === 'email'          → insere em email
 *      * tipo === 'nome_completo'  → insere em nome
 * - Evita duplicatas via INSERT … WHERE NOT EXISTS
 * - Retorna { aguardando: true } para o front-end dar retry
 */
export const priority = async (req, res) => {
  let { tipo, valor } = req.body;

  if (!tipo || !valor) {
    return res.status(400).json({ erro: 'Preencha todos os campos' });
  }

  // Se for CPF ou Telefone, retira qualquer caractere não numérico
  if (tipo === 'cpf_cnpj' || tipo === 'numero_telefone') {
    valor = valor.trim().replace(/\D/g, '');
  } else {
    valor = valor.trim();
  }

  // Decide em qual coluna inserir, baseado no `tipo` exato do front
  let colunaDestino;
  switch (tipo) {
    case 'cpf_cnpj':
      colunaDestino = 'cpf_cnpj';
      break;
    case 'numero_telefone':
      colunaDestino = 'telefone';   // NA TABELA priority, o campo chama-se `telefone`
      break;
    case 'email':
      colunaDestino = 'email';
      break;
    case 'nome_completo':
      colunaDestino = 'nome';
      break;
    default:
      colunaDestino = 'nome';
      break;
  }

  try {
    const insertQuery = `
      INSERT INTO priority (${colunaDestino}, processado)
      SELECT $1, false
      WHERE NOT EXISTS (
        SELECT 1 FROM priority WHERE ${colunaDestino} = $1
      );
    `;
    await pool.query(insertQuery, [valor]);
  } catch (err) {
    console.error('❌ Erro ao inserir na tabela priority:', err);
    return res.status(500).json({ erro: 'Erro ao inserir na fila de prioridade' });
  }

  return res.json({ aguardando: true });
};
