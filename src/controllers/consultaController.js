import { ConsultaPeople } from '../middlewares/consultaMiddleware.js';
import { priority }       from '../middlewares/priorityMiddleware.js';
import db from '../models/index.js';

const { SearchHistory } = db;

export async function consultar(req, res, next) {
  try {
    console.log('🟡 Iniciando consulta...');

    // Atrelar histórico assim que a resposta for enviada
    res.once('finish', async () => {
      try {
        if (res.statusCode === 200 && req.user?.id && req.body?.valor) {
          console.log('🟢 Salvando histórico:', req.body.valor, 'por user', req.user.id);
          await SearchHistory.create({
            term: req.body.valor,
            created_by: req.user.id
          });
        }
      } catch (err) {
        console.error('❌ Erro ao salvar histórico:', err);
      }
    });

    // Apenas chama os middlewares normalmente
    ConsultaPeople(req, res, err => {
      if (err) return next(err);
      priority(req, res, err2 => {
        if (err2) return next(err2);
      });
    });

  } catch (err) {
    console.error('❌ Erro no consultar:', err);
    return res.status(500).json({ erro: 'Erro interno do servidor' });
  }
}
