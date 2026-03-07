import axios from 'axios';
import User from '../models/User.js';

export const getPrediction = async (req, res) => {
    try {
        // 1. Destructure fields from the frontend
        const { symptoms, userId, age, duration } = req.body;
        
        // 2. Define the AI URL
        const aiUrl = process.env.AI_ENGINE_URL || 'http://127.0.0.1:8000/predict';
        
        // 3. Call the Python FastAPI server
        // Ensure we send the symptoms array wrapped in an object
        const response = await axios.post(aiUrl, { symptoms });

        // 4. Extract result - matching the "prediction" key from Python
        const result = response.data.prediction;

        if (!result) {
            console.error("AI Engine returned no data. Check main.py return keys.");
            return res.status(400).json({ success: false, message: "AI Engine returned no data" });
        }

        // 5. Save to MongoDB history if userId is provided
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

        // 6. Return the result to the React frontend
        res.json({ success: true, prediction: result });
        
    } catch (error) {
        console.error("--- AI BRIDGE ERROR ---");
        if (error.code === 'ECONNREFUSED') {
            console.error("ERROR: Python FastAPI is not running on port 8000!");
        } else {
            console.error("Message:", error.message);
        }
        
        res.status(500).json({ 
            success: false, 
            message: "Failed to connect to AI Engine. Ensure Python server is running." 
        });
    }
};