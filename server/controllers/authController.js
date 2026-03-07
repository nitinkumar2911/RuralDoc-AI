import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// --- EXISTING REGISTER ---
export const register = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 12);
        const newUser = new User({ name, email, password: hashedPassword, history: [] }); // Initialize empty history
        await newUser.save();
        res.status(201).json({ message: "User registered successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// --- EXISTING LOGIN ---
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: "User not found" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
        // Ensure user object includes the ID for the frontend to use
        res.json({ token, user: { id: user._id, name: user.name } });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// --- NEW: GET USER HISTORY ---
export const getUserHistory = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Find user by ID and only return the history field
        const user = await User.findById(id).select('history');
        
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Send the history array back to React
        res.status(200).json({ 
            history: user.history || [] 
        });
    } catch (error) {
        res.status(500).json({ message: "Error fetching history: " + error.message });
    }
};