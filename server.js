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
import { ConsultaPeople } from './src/middlewares/consultaMiddleware.js';
import { priority }      from './src/middlewares/priorityMiddleware.js';
import { checkAdminOrSuper } from './src/middlewares/superAdminMiddleware.js';
import { consultar } from './src/controllers/consultaController.js';

// Import de controllers
import { list as historyList }   from './src/controllers/historyController.js';
import { create as createUser }  from './src/controllers/userController.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
const app        = express();
const PORT       = process.env.PORT || 2222;
app.get('/ping', (_req, res) => res.send('pong'));

// 1) Middlewares globais
app.use(cors());
app.use(express.json());

// 2) Servir estáticos (HTML, CSS, JS, imagens) da pasta public/
app.use(express.static(join(__dirname, 'public')));

// 3) Rotas de autenticação
app.use('/auth', authRoutes);

// 4) Endpoints de API protegidos
// 4a) Quem sou eu
app.get('/api/me', authenticateToken, (req, res) => {
  const { id, username, role, email } = req.user;
  res.json({ id, username, role, email });
});

// 4b) Histórico de buscas
app.get('/api/history',
  authenticateToken,
  historyList
);


// 4c) Criação de usuário
app.post('/api/users',
  authenticateToken,
  checkAdminOrSuper,
  createUser
);

// 5) Página principal (consulta)
app.get('/', (_req, res) =>
  res.sendFile(join(__dirname, 'public', 'index.html'))
);
app.get('/login', (_req, res) =>
  res.sendFile(join(__dirname, 'public', 'auth.html'))
);

// 6) Endpoint de consulta de dados
app.post('/consultar', authenticateToken, consultar);

// 7) Admin Panel
app.get('/admin-panel',
  (_req, res) =>
    res.sendFile(join(__dirname, 'public', 'adminpanel.html'))
);
// logo após todas as suas rotas, mas antes do app.listen
app.use((err, req, res, next) => {
  console.error('🚨 ERRO NO EXPRESS:', err.stack || err);
  res.status(500).send('Erro interno no servidor');
});

// 8) Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
