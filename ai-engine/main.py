import os
import joblib
from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

app = FastAPI()

# Enable CORS for cross-origin communication between services
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load the models using paths consistent with your folder structure
try:
    model = joblib.load('models/rural_doc_model.pkl')
    symptom_list = joblib.load('models/symptom_list.pkl')
    print("AI Model and Symptom List loaded successfully.")
except Exception as e:
    print(f"Error loading models: {e}")

class PredictionRequest(BaseModel):
    symptoms: list

@app.get("/")
async def root():
    return {"status": "AI Engine is running"}

@app.post("/predict")
async def predict(data: PredictionRequest):
    # Create an input vector of 0s
    input_vector = [0] * len(symptom_list)
    
    # Set 1 if the symptom provided by user matches our list
    for s in data.symptoms:
        # Standardize symptom names to match training data
        clean_s = s.strip().lower().replace(' ', '_')
        if clean_s in symptom_list:
            index = symptom_list.index(clean_s)
            input_vector[index] = 1
            
    prediction = model.predict([input_vector])[0]
    
    # Returns key "prediction" to match your backend Controller
    return {"prediction": str(prediction)}

if __name__ == "__main__":
    # CRITICAL: Render provides a dynamic PORT environment variable. 
    # Using 127.0.0.1 or a fixed port 8000 will cause deployment to fail.
    port = int(os.environ.get("PORT", 10000))
    uvicorn.run(app, host="0.0.0.0", port=port)