import express from 'express';
import { register, login, getUserHistory, sendOTP } from '../controllers/authController.js'; // Added getUserHistory

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/send-otp', sendOTP);

// --- ADD THIS LINE FOR HISTORY ---
// This matches the frontend call: axios.get(`http://localhost:5000/api/auth/user/${userId}`)
router.get('/user/:id', getUserHistory); 

export default router;