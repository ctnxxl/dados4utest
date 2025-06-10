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

  // busca pelo username
  const user = await User.findOne({ where: { username } });
  if (!user) {
    return res.status(401).json({ error: 'Credenciais inválidas' });
  }

  // compara senha
  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) {
    return res.status(401).json({ error: 'Credenciais inválidas' });
  }

  // gera JWT
  const token = jwt.sign(
    { id: user.id, role: user.role },
    JWT_SECRET,
    { expiresIn: '8h' }
  );

  return res.json({ token });
}

// POST /auth/create-admin
export async function createAdmin(req, res) {
  const { username, password, email } = req.body;

  // impede duplicação de username
  if (await User.findOne({ where: { username } })) {
    return res.status(409).json({ error: 'Username já cadastrado' });
  }

  // (opcionalmente) impede duplicação de email
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

  return res
    .status(201)
    .json({ id: newAdmin.id, username: newAdmin.username, role: newAdmin.role });
}

// POST /auth/create-user
export async function createUser(req, res) {
  const { username, password, email } = req.body;

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

  return res
    .status(201)
    .json({ id: newUser.id, username: newUser.username, role: newUser.role });
}
