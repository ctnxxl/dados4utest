// src/controllers/userController.js
import { User }   from '../models/index.js';
import bcrypt     from 'bcrypt';

export async function create(req, res) {
  try {
    // pegue username, não name
    const { username, email, role, password } = req.body;

    // só superadmin pode criar superadmin
    if (role === 'superadmin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Somente superadmin pode criar superadmin' });
    }

    // gere o hash e coloque em password_hash
    const password_hash = await bcrypt.hash(password, 10);

    // crie usando os nomes corretos de coluna
    const u = await User.create({
      username,
      email,
      role,
      password_hash
    });

    // retorne o que faz sentido no front
    res.status(201).json({
      id:       u.id,
      username: u.username,
      email:    u.email,
      role:     u.role
    });

  } catch (err) {
    console.error(err);
    if (err.name === 'SequelizeValidationError') {
      // mostre todas as mensagens de validação
      const msgs = err.errors.map(e => e.message);
      return res.status(400).json({ error: msgs.join('; ') });
    }
    res.status(500).json({ error: 'Erro ao criar usuário' });
  }
}
