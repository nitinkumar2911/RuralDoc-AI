import axios from 'axios';
import User from '../models/User.js';

export const getPrediction = async (req, res) => {
    try {
        const { symptoms, userId, age, duration } = req.body;
        // Use port 10000 for Render compatibility
        const aiUrl = process.env.AI_ENGINE_URL || 'http://127.0.0.1:10000/predict';
        
        console.log("--- AI REQUEST START ---");
        
        const response = await axios.post(aiUrl, 
            { symptoms },
            { timeout: 25000 } 
        );

        // --- EXTRACT ALL DATA ---
        const { prediction, description, precautions } = response.data;

        if (!prediction) {
            return res.status(400).json({ 
                success: false, 
                message: "AI Engine error: Missing prediction key." 
            });
        }

        // Save to MongoDB history including new fields
        if (userId) {
            const historyEntry = { 
                symptoms: Array.isArray(symptoms) ? symptoms : [symptoms], 
                prediction,
                description: description || "No description available.",
                precautions: precautions || [],
                age: age || "N/A",
                duration: duration || "N/A",
                date: new Date()
            };

            await User.findByIdAndUpdate(userId, {
                $push: { history: historyEntry }
            });
        }

        // Return EVERYTHING to the React Frontend
        res.json({ 
            success: true, 
            prediction,
            description: description || "No additional information.",
            precautions: precautions || ["Consult a local doctor."]
        });
        
    } catch (error) {
        console.error("AI BRIDGE ERROR:", error.message);
        res.status(500).json({ 
            success: false, 
            message: "AI Engine is waking up. Please try again in 30 seconds." 
        });
    }
};