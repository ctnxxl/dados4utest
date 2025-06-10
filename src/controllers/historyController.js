// src/controllers/historyController.js
import { SearchHistory, User } from '../models/index.js';

export async function list(req, res) {
  try {
    const where = {};
    if (req.user.role === 'admin') {
      where.created_by = req.user.id;
    }

    const list = await SearchHistory.findAll({
      where,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id','username']   // <-- aqui
        }
      ],
      order: [['created_at', 'DESC']]
    });

    res.json(
      list.map(h => ({
        id:        h.id,
        userName:  h.user.username,      // <-- e aqui
        term:      h.term,
        createdAt: h.createdAt
      }))
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao listar histórico' });
  }
}
