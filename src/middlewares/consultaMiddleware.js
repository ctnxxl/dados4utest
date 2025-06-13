// src/middlewares/consultaMiddleware.js

import { fetchLeadData } from '../services/leadService.js'; // 👈 Importa a nova função do serviço

/**
 * ConsultaPeople (simplificado):
 * - Usa o serviço fetchLeadData para buscar os dados.
 * - Se encontrar, retorna o JSON.
 * - Se não encontrar, passa para o próximo middleware (priority).
 */
export const ConsultaPeople = async (req, res, next) => {
  const { tipo, valor } = req.body;

  try {
    // 1. Usa a função de serviço para buscar os dados
    const data = await fetchLeadData(tipo, valor);

    if (data) {
      // 2. Se a função retornou dados, envie a resposta e termine.
      return res.json(data);
    } else {
      // 3. Se a função retornou null (não encontrou), passe para o priority.
      return next();
    }
  } catch (err) {
    // 4. Se a busca deu um erro inesperado, retorne um erro 500.
    return res.status(500).json({ erro: 'Erro interno ao consultar os dados.' });
  }
};