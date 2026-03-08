import axios from 'axios';
import User from '../models/User.js';

export const getPrediction = async (req, res) => {
    try {
        const { symptoms, userId, age, duration } = req.body;
        const aiUrl = process.env.AI_ENGINE_URL || 'http://127.0.0.1:8000/predict';
        
        console.log("--- AI REQUEST START ---");
        console.log("Connecting to AI at:", aiUrl);

        // Call the Python FastAPI server
        const response = await axios.post(aiUrl, 
            { symptoms },
            { timeout: 25000 } // Increased to 25s for Render Free Tier "cold starts"
        );

        // --- THE KEY FIX ---
        // Look for any variation the Python engine might return
        const result = response.data.prediction || response.data.result || response.data.disease;

        if (!result) {
            console.error("AI Engine returned data, but no 'prediction' key was found. Response:", response.data);
            return res.status(400).json({ 
                success: false, 
                message: "AI Engine error: Missing prediction key in response." 
            });
        }

        // Save to MongoDB history ONLY if we have a result
        if (userId) {
            const historyEntry = { 
                symptoms: Array.isArray(symptoms) ? symptoms : [symptoms], 
                prediction: result,
                age: age || "N/A",
                duration: duration || "N/A",
                date: new Date()
            };

            await User.findByIdAndUpdate(userId, {
                $push: { history: historyEntry }
            });
            console.log("History saved successfully.");
        }

        console.log("Prediction Successful:", result);
        
        // Return BOTH success and prediction to ensure the frontend sees it
        res.json({ 
            success: true, 
            prediction: result 
        });
        
    } catch (error) {
        console.error("--- AI BRIDGE ERROR ---");
        console.error("Message:", error.message);
        
        let errorMsg = "AI Engine Offline. Please try again in 1 minute.";
        if (error.code === 'ECONNABORTED') errorMsg = "AI Engine timed out. It is still waking up.";
        
        res.status(500).json({ 
            success: false, 
            message: errorMsg 
        });
    }
};