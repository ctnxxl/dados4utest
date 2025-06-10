import db from '../models/index.js';
const { SearchHistory, User } = db;

export async function list(req, res) {
  try {
    let historyList = [];

    if (req.user.role === 'admin') {
      // 1. Pega todos os usuários criados por este admin
      const usersCriados = await User.findAll({
        where: { created_by: req.user.id },
        attributes: ['id']
      });
      const idsDosCriados = usersCriados.map(u => u.id);

      // 2. Filtra o histórico para apenas os desses users
      historyList = await SearchHistory.findAll({
        where: {
          created_by: idsDosCriados
        },
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'username']
          }
        ],
        order: [['created_at', 'DESC']]
      });

    } else {
      // Se for superadmin, mostra tudo
      historyList = await SearchHistory.findAll({
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'username']
          }
        ],
        order: [['created_at', 'DESC']]
      });
    }

    res.json(historyList.map(h => ({
      id:        h.id,
      userName:  h.user?.username || 'desconhecido',
      term:      h.term,
      createdAt: h.createdAt
    })));

  } catch (err) {
    console.error('❌ Erro ao listar histórico:', err);
    res.status(500).json({ error: 'Erro ao listar histórico' });
  }
}
