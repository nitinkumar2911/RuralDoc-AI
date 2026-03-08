import axios from 'axios';
import User from '../models/User.js';

export const getPrediction = async (req, res) => {
    try {
        const { symptoms, userId, age, duration } = req.body;
        
        // 1. Get the URL from Environment Variables
        // If the variable is missing, it will use the fallback
        const aiUrl = process.env.AI_ENGINE_URL;
        
        // 2. LOGGING: This is vital to debug. 
        // Check your Render "Logs" tab to see if this prints the Render URL or "undefined"
        console.log("--- AI REQUEST START ---");
        console.log("Connecting to AI at:", aiUrl || "FALLBACK: http://127.0.0.1:8000/predict");

        if (!aiUrl) {
            console.warn("WARNING: AI_ENGINE_URL is not set in Render environment variables!");
        }

        // 3. Call the Python FastAPI server
        // Using a 15-second timeout because Render's free tier can be slow to respond
        const response = await axios.post(aiUrl || 'http://127.0.0.1:8000/predict', 
            { symptoms },
            { timeout: 15000 } 
        );

        const result = response.data.prediction;

        if (!result) {
            console.error("AI Engine returned no data. Check Python return keys.");
            return res.status(400).json({ success: false, message: "AI Engine returned no data" });
        }

        // 4. Save to MongoDB history
        if (userId) {
            await User.findByIdAndUpdate(userId, {
                $push: { 
                    history: { 
                        symptoms, 
                        prediction: result,
                        age: age || "N/A",
                        duration: duration || "N/A",
                        date: new Date()
                    } 
                }
            });
        }

        console.log("Prediction Successful:", result);
        res.json({ success: true, prediction: result });
        
    } catch (error) {
        console.error("--- AI BRIDGE ERROR ---");
        console.error("Status Code:", error.response?.status);
        console.error("Error Message:", error.message);
        
        // Identify specifically why it failed to help you debug
        let errorMsg = "AI Engine Offline. Please try again in 1 minute.";
        if (error.code === 'ECONNABORTED') errorMsg = "AI Engine timed out. It might be waking up.";
        if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') errorMsg = "Could not reach AI URL. Check Environment Variables.";

        res.status(500).json({ 
            success: false, 
            message: errorMsg 
        });
    }
};