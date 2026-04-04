import os
import joblib
from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load the "Smart" Brain
try:
    model = joblib.load('models/rural_doc_model.pkl')
    symptom_list = joblib.load('models/symptom_list.pkl')
    description_data = joblib.load('models/description_data.pkl')
    precaution_data = joblib.load('models/precaution_data.pkl')
    print("AI Engine Loaded Successfully with 4-Dataset Integration.")
except Exception as e:
    print(f"Error loading models: {e}")

class PredictionRequest(BaseModel):
    symptoms: list

@app.get("/")
async def root():
    return {"status": "AI Engine is Online", "model": "RandomForest-v2"}

@app.post("/predict")
async def predict(data: PredictionRequest):
    # 1. Create input vector
    input_vector = [0] * len(symptom_list)
    for s in data.symptoms:
        clean_s = s.strip().lower().replace(' ', '_')
        if clean_s in symptom_list:
            index = symptom_list.index(clean_s)
            input_vector[index] = 1
            
    # 2. Predict Disease
    disease = model.predict([input_vector])[0]
    
    # 3. Fetch descriptions and precautions
    description = description_data.get(disease, "No description available for this condition.")
    precautions = precaution_data.get(disease, ["Consult a healthcare professional."])
    
    return {
        "prediction": str(disease),
        "description": description,
        "precautions": precautions
    }

if __name__ == "__main__":
    # Render dynamic port logic
    port = int(os.environ.get("PORT", 10000))
    uvicorn.run(app, host="0.0.0.0", port=port)