import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import authRoutes from './routes/authRoutes.js';
import predictRoutes from './routes/predictRoutes.js';

// 1. Initialize dotenv
dotenv.config();

const app = express();

// 2. Startup Logs
console.log("--- STARTUP CHECK ---");
console.log("MONGO_URI Status:", process.env.MONGO_URI ? "READY" : "MISSING");
console.log("AI_ENGINE_URL:", process.env.AI_ENGINE_URL || "NOT SET");

// 3. CORS Configuration
app.use(cors({
    origin: ["https://rural-doc-ai.vercel.app", "http://localhost:5173"], 
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());

// 4. Trust Proxy
app.set('trust proxy', 1);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/ai', predictRoutes);

// Health Check
app.get('/health', (req, res) => res.status(200).send("Server is healthy"));

// 5. Global Error Handler (Prevents server crashes on bad requests)
app.use((err, req, res, next) => {
    console.error("Global Error:", err.stack);
    res.status(500).json({ message: "Internal Server Error", error: err.message });
});

// 6. Port and Connection Logic
const PORT = process.env.PORT || 10000;

mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log("✅ MongoDB Connected Successfully");
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`🚀 Backend Server running on port ${PORT}`);
        });
    })
    .catch(err => {
        console.error("❌ MongoDB Connection Error:", err);
        process.exit(1); 
    });