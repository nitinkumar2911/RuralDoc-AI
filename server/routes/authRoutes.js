import express from 'express';
import { register, login, getUserHistory } from '../controllers/authController.js';

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/login', login);

// User specific routes
// This matches your frontend call: /api/auth/user/:id
router.get('/user/:id', getUserHistory); 

export default router;