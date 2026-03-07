import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import authRoutes from './routes/authRoutes.js';
import predictRoutes from './routes/predictRoutes.js';

dotenv.config();
const app = express();

// --- UPDATED CORS SETTINGS ---
app.use(cors({
    origin: "https://rural-doc-ai.vercel.app", // Your exact Vercel URL
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"]
}));

app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/ai', predictRoutes);

// --- UPDATED PORT LOGIC ---
// Render provides a dynamic port, so we use process.env.PORT or 10000
const PORT = process.env.PORT || 10000;

mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log("✅ MongoDB Connected");
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`🚀 Server on port ${PORT}`);
        });
    })
    .catch(err => console.log("❌ MongoDB Connection Error:", err));