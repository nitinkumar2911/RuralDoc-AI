import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';

// Temporary in-memory storage for OTPs
const otpStore = new Map(); 

// --- CONFIGURE EMAIL TRANSPORTER (FIXED FOR RENDER TIMEOUTS) ---
const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false, // Must be false for Port 587
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    tls: {
        rejectUnauthorized: false,
        minVersion: "TLSv1.2"
    },
    connectionTimeout: 15000 // Give it 15 seconds to connect
});

// --- NEW: SEND OTP ---
export const sendOTP = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ message: "Email is required" });

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Store OTP with 5-minute expiry
        otpStore.set(email, { otp, expires: Date.now() + 300000 });

        console.log(`Attempting to send OTP to: ${email} using Port 587`);

        await transporter.sendMail({
            from: `"RuralDoc AI" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: "Your Verification Code",
            html: `
                <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                    <h2 style="color: #10b981;">RuralDoc AI Verification</h2>
                    <p>Use the code below to complete your registration:</p>
                    <div style="background: #f3f4f6; padding: 15px; text-align: center; border-radius: 8px;">
                        <b style="font-size: 32px; letter-spacing: 5px; color: #1f2937;">${otp}</b>
                    </div>
                    <p style="color: #6b7280; font-size: 12px; margin-top: 20px;">This code expires in 5 minutes.</p>
                </div>`
        });

        console.log("✅ Email sent successfully to:", email);
        res.status(200).json({ message: "OTP sent successfully" });
    } catch (error) {
        console.error("Nodemailer Error Details:", error);
        res.status(500).json({ message: "Failed to send email: " + error.message });
    }
};

// --- REGISTER (WITH OTP VERIFICATION) ---
export const register = async (req, res) => {
    try {
        const { name, email, password, otp } = req.body;

        const storedData = otpStore.get(email);
        
        if (!storedData || storedData.otp !== otp) {
            return res.status(400).json({ message: "Invalid verification code" });
        }
        
        if (Date.now() > storedData.expires) {
            otpStore.delete(email);
            return res.status(400).json({ message: "OTP has expired" });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ message: "User already exists" });

        const hashedPassword = await bcrypt.hash(password, 12);
        const newUser = new User({ name, email, password: hashedPassword, history: [] });
        await newUser.save();

        otpStore.delete(email);
        res.status(201).json({ message: "User registered successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// --- LOGIN ---
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