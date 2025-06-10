import { Router } from 'express';
import { login, createAdmin, createUser } from '../controllers/authController.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';
import { isAdmin } from '../middlewares/roleMiddleware.js';

const router = Router();

router.post('/login', login);
router.post('/create-admin', createAdmin);
router.post('/create-user', authenticateToken, isAdmin, createUser);

export default router;
