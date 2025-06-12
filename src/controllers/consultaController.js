// src/controllers/consultaController.js

import { ConsultaPeople } from '../middlewares/consultaMiddleware.js';
import { priority }       from '../middlewares/priorityMiddleware.js';
import db from '../models/index.js';

const { SearchHistory, Cnpj } = db;

export async function consultar(req, res, next) {
  const { tipo, valor } = req.body;

  console.log('🟡 Iniciando consulta...', { tipo, valor });

  // Quando for consulta de CNPJ
  if (tipo === 'cnpj') {
    try {
      const empresa = await Cnpj.findOne({ where: { cnpj: valor } });
      if (!empresa) {
        return res.status(404).json({ erro: 'CNPJ não encontrado' });
      }
      return res.json(empresa);
    } catch (err) {
      console.error('❌ Erro ao consultar CNPJ:', err);
      return res.status(500).json({ erro: 'Erro interno do servidor' });
    }
  }

  // Para CPF (ou demais): mantém o fluxo com middlewares
  try {
    // Atrelar histórico assim que a resposta for enviada
    res.once('finish', async () => {
      try {
        if (res.statusCode === 200 && req.user?.id && valor) {
          console.log('🟢 Salvando histórico:', valor, 'por user', req.user.id);
          await SearchHistory.create({
            term: valor,
            created_by: req.user.id
          });
        }
      } catch (err) {
        console.error('❌ Erro ao salvar histórico:', err);
      }
    });

    // Chama os middlewares de consulta em cadeia
    ConsultaPeople(req, res, err => {
      if (err) return next(err);
      priority(req, res, err2 => {
        if (err2) return next(err2);
      });
    });

  } catch (err) {
    console.error('❌ Erro no consultar (CPF):', err);
    return res.status(500).json({ erro: 'Erro interno do servidor' });
  }
}
