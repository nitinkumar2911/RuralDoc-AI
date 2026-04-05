import os
import joblib
import uvicorn
from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Enable CORS for your Node.js/React frontend
app.add_middleware(
    CORSMiddleware, 
    allow_origins=["*"], 
    allow_methods=["*"], 
    allow_headers=["*"]
)

# 1. Load the "Brain" files created by your training script
# Ensure these files exist in a 'models/' folder
try:
    model = joblib.load('models/rural_doc_model.pkl')
    symptom_list = joblib.load('models/symptom_list.pkl')
    description_data = joblib.load('models/description_data.pkl')
    precaution_data = joblib.load('models/precaution_data.pkl')
    print("✅ All models and metadata dictionaries loaded successfully.")
except Exception as e:
    print(f"❌ Error loading models: {e}")

class PredictionRequest(BaseModel):
    symptoms: list

@app.post("/predict")
async def predict(data: PredictionRequest):
    # 2. Prepare the input vector (Binary: 0 or 1)
    input_vector = [0] * len(symptom_list)
    for s in data.symptoms:
        # Normalize input symptoms to match the training list format
        clean_s = str(s).strip().lower().replace(' ', '_')
        if clean_s in symptom_list:
            input_vector[symptom_list.index(clean_s)] = 1
            
    # 3. Predict the Disease
    prediction = model.predict([input_vector])[0]
    
    # 4. CRITICAL: Clean the prediction string to ensure dictionary match
    # This prevents issues where 'Malaria ' (with space) won't find its description
    disease_key = str(prediction).strip()

    # 5. Fetch Metadata
    description = description_data.get(disease_key, "Detailed description not found for this condition.")
    precautions = precaution_data.get(disease_key, ["Consult a medical professional.", "Monitor symptoms closely."])

    return {
        "prediction": disease_key,
        "description": description,
        "precautions": precautions
    }

@app.get("/health")
async def health():
    return {"status": "healthy"}

if __name__ == "__main__":
    # Use port 10000 for Render/Heroku compatibility
    port = int(os.environ.get("PORT", 10000))
    uvicorn.run(app, host="0.0.0.0", port=port)