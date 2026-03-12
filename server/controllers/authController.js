import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// --- REGISTER (Direct Registration - No OTP) ---
export const register = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Basic validation
        if (!name || !email || !password) {
            return res.status(400).json({ message: "All fields are required" });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "User already exists" });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Create new user directly
        const newUser = new User({ 
            name, 
            email, 
            password: hashedPassword, 
            history: [] 
        });
        
        await newUser.save();

        res.status(201).json({ message: "User registered successfully" });
    } catch (error) {
        console.error("Registration Error:", error);
        res.status(500).json({ message: "Registration failed. Please try again." });
    }
};

// --- LOGIN ---
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }

        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: "User not found" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
        
        res.json({ 
            token, 
            user: { id: user._id, name: user.name } 
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// --- GET HISTORY ---
export const getUserHistory = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findById(id).select('history');
        if (!user) return res.status(404).json({ message: "User not found" });
        
        res.status(200).json({ history: user.history || [] });
    } catch (error) {
        res.status(500).json({ message: "Error fetching history" });
    }
};