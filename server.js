// server.js
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();

// Import de rotas e middlewares
import authRoutes from './src/routes/authRoutes.js';
import { authenticateToken } from './src/middlewares/authMiddleware.js';
import { checkAdminOrSuper } from './src/middlewares/superAdminMiddleware.js';
import { priority }          from './src/middlewares/priorityMiddleware.js';
import { ConsultaPeople }    from './src/middlewares/consultaMiddleware.js';
import { consultarCnpj }      from './src/controllers/consultaCnpjController.js';
import db                    from './src/models/index.js';

// Import de controllers
import { list as historyList } from './src/controllers/historyController.js';
import { create as createUser } from './src/controllers/userController.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
const app        = express();
const PORT       = process.env.PORT || 2222;

// Ping
app.get('/ping', (_req, res) => res.send('pong'));

// 1) Middlewares globais
app.use(cors());
app.use(express.json());

// 2) Servir estáticos (HTML, CSS, JS, imagens)
app.use(express.static(join(__dirname, 'public')));

// 3) Rotas de autenticação
app.use('/auth', authRoutes);

// 4) Endpoints de API protegidos
// 4a) Quem sou eu
app.get(
  '/api/me',
  authenticateToken,
  (req, res) => {
    const { id, username, role, email } = req.user;
    console.log('Usuário autenticado:', req.user);
    res.json({ id, username, role, email });
  }
);

// 4b) Histórico de buscas
app.get(
  '/api/history',
  authenticateToken,
  historyList
);
app.get(
  '/api/user/me',
  authenticateToken,
  async (req, res) => {
    const user = await db.User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
    res.json({ username: user.username });
  }
);

// 4c) Criação de usuário
app.post(
  '/api/users',
  authenticateToken,
  checkAdminOrSuper,
  createUser
);

// 5) Páginas estáticas
app.get(
  '/',
  (_req, res) => res.sendFile(join(__dirname, 'public', 'index.html'))
);
app.get(
  '/login',
  (_req, res) => res.sendFile(join(__dirname, 'public', 'auth.html'))
);
app.get(
  '/admin-panel',
  (_req, res) => res.sendFile(join(__dirname, 'public', 'adminpanel.html'))
);

// 6) Endpoints de consulta de dados
// CPF / Nome / Telefone / E-mail → Checa lead → priority → checa lead de novo
app.post(
  '/consultar',
  authenticateToken,
  ConsultaPeople,
  priority
);

// CNPJ específico
app.post(
  '/consultar-cnpj',
  authenticateToken,
  consultarCnpj
);

// Error handler genérico (último middleware)
app.use((err, req, res, next) => {
  console.error('🚨 ERRO NO EXPRESS:', err.stack || err);
  res.status(500).json({ erro: 'Erro interno no servidor' });
});

// 7) Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
