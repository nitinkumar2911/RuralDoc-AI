import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';

// Temporary in-memory storage for OTPs (For production, use Redis or a DB collection)
const otpStore = new Map(); 

// --- CONFIGURE EMAIL TRANSPORTER ---
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER, // Your gmail
        pass: process.env.EMAIL_PASS  // Your Gmail App Password
    }
});

// --- NEW: SEND OTP ---
export const sendOTP = async (req, res) => {
    try {
        const { email } = req.body;
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Store OTP with 5-minute expiry
        otpStore.set(email, { otp, expires: Date.now() + 300000 });

        await transporter.sendMail({
            from: '"RuralDoc AI" <no-reply@ruraldoc.com>',
            to: email,
            subject: "Your Verification Code",
            html: `<div style="font-family: Arial; padding: 20px; border: 1px solid #eee;">
                    <h2>Verify Your Account</h2>
                    <p>Your OTP code is: <b style="font-size: 24px; color: #10b981;">${otp}</b></p>
                    <p>This code expires in 5 minutes.</p>
                   </div>`
        });

        res.status(200).json({ message: "OTP sent successfully" });
    } catch (error) {
        res.status(500).json({ message: "Error sending email: " + error.message });
    }
};

// --- UPDATED REGISTER (WITH OTP VERIFICATION) ---
export const register = async (req, res) => {
    try {
        const { name, email, password, otp } = req.body;

        // Check if OTP exists and matches
        const storedData = otpStore.get(email);
        if (!storedData || storedData.otp !== otp) {
            return res.status(400).json({ message: "Invalid or expired OTP" });
        }
        if (Date.now() > storedData.expires) {
            otpStore.delete(email);
            return res.status(400).json({ message: "OTP expired" });
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        const newUser = new User({ name, email, password: hashedPassword, history: [] });
        await newUser.save();

        // Clear OTP after successful registration
        otpStore.delete(email);

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
        res.json({ token, user: { id: user._id, name: user.name } });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// --- EXISTING GET HISTORY ---
export const getUserHistory = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findById(id).select('history');
        if (!user) return res.status(404).json({ message: "User not found" });
        res.status(200).json({ history: user.history || [] });
    } catch (error) {
        res.status(500).json({ message: "Error fetching history: " + error.message });
    }
};