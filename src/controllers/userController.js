// src/controllers/userController.js
import db from '../models/index.js';
const { User } = db;
import bcrypt from 'bcrypt';

export async function create(req, res) {
  try {
    const { username, email, role, password } = req.body;

    if (role === 'superadmin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Somente superadmin pode criar superadmin' });
    }
    if (role === 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Somente superadmin pode criar admin' });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const userData = {
      username,
      email,
      role,
      password_hash
    };

    // Só registra created_by se for criando usuário comum
    if (role === 'user') {
      userData.created_by = req.user.id;
    }

    const u = await User.create(userData);

    res.status(201).json({
      id:       u.id,
      username: u.username,
      email:    u.email,
      role:     u.role
    });

  } catch (err) {
    console.error(err);
    if (err.name === 'SequelizeValidationError') {
      const msgs = err.errors.map(e => e.message);
      return res.status(400).json({ error: msgs.join('; ') });
    }
    res.status(500).json({ error: 'Erro ao criar usuário' });
  }
}
