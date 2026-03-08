import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import authRoutes from './routes/authRoutes.js';
import predictRoutes from './routes/predictRoutes.js';

// 1. Initialize dotenv at the very top
dotenv.config();

const app = express();

// 2. DEBUG LOGGING: 
// Check your Render "Logs" tab to ensure this prints the Render URL
console.log("--- STARTUP CHECK ---");
console.log("AI_ENGINE_URL configured as:", process.env.AI_ENGINE_URL || "NOT SET");

// 3. UPDATED CORS SETTINGS
// Allow your Vercel frontend
app.use(cors({
    origin: ["https://rural-doc-ai.vercel.app", "http://localhost:5173"], 
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"]
}));

app.use(express.json());

// 4. Trust Proxy (Required for some deployment environments like Render)
app.set('trust proxy', 1);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/ai', predictRoutes);

// Health Check Route (Helps Render keep the service active)
app.get('/health', (req, res) => res.send("Server is healthy"));

// 5. UPDATED PORT LOGIC
const PORT = process.env.PORT || 10000;

mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log("✅ MongoDB Connected");
        // Use 0.0.0.0 to bind to all network interfaces on Render
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`🚀 Backend Server running on port ${PORT}`);
        });
    })
    .catch(err => {
        console.error("❌ MongoDB Connection Error:", err);
        process.exit(1); // Exit if DB fails
    });