import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;

export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  jwt.verify(token, JWT_SECRET, (err, payload) => {
    if (err) {
      console.error('Token inválido:', err);
      return res.status(403).json({ error: 'Token inválido' });
    }

    // 🔍 Mostra no terminal o conteúdo do token decodificado
    console.log('Token decodificado:', payload);

    req.user = payload; // payload = { id, username, email, role }
    next();
  });
}
