// src/controllers/authController.js
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from '../models/user.js';
import dotenv from 'dotenv';
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;

// POST /auth/login
export async function login(req, res) {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ where: { username } });

    if (!user) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    // ✅ Token com dados completos
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    return res.json({ token });

  } catch (err) {
    console.error('Erro no login:', err);
    return res.status(500).json({ error: 'Erro interno no servidor' });
  }
}

// POST /auth/create-admin
export async function createAdmin(req, res) {
  const { username, password, email } = req.body;

  try {
    if (await User.findOne({ where: { username } })) {
      return res.status(409).json({ error: 'Username já cadastrado' });
    }

    if (email && await User.findOne({ where: { email } })) {
      return res.status(409).json({ error: 'E-mail já cadastrado' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const newAdmin = await User.create({
      username,
      email: email || null,
      password_hash,
      role: 'admin'
    });

    return res.status(201).json({
      id: newAdmin.id,
      username: newAdmin.username,
      role: newAdmin.role
    });

  } catch (err) {
    console.error('Erro ao criar admin:', err);
    return res.status(500).json({ error: 'Erro interno no servidor' });
  }
}

// POST /auth/create-user
export async function createUser(req, res) {
  const { username, password, email } = req.body;

  try {
    if (await User.findOne({ where: { username } })) {
      return res.status(409).json({ error: 'Username já cadastrado' });
    }

    if (email && await User.findOne({ where: { email } })) {
      return res.status(409).json({ error: 'E-mail já cadastrado' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      username,
      email: email || null,
      password_hash,
      role: 'user'
    });

    return res.status(201).json({
      id: newUser.id,
      username: newUser.username,
      role: newUser.role
    });

  } catch (err) {
    console.error('Erro ao criar usuário:', err);
    return res.status(500).json({ error: 'Erro interno no servidor' });
  }
}
