from fastapi import FastAPI
from pydantic import BaseModel
import joblib
from fastapi.middleware.cors import CORSMiddleware # Added for browser security

app = FastAPI()

# Enable CORS so your frontend can talk to this server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load the brain
model = joblib.load('models/rural_doc_model.pkl')
symptom_list = joblib.load('models/symptom_list.pkl')

class PredictionRequest(BaseModel):
    symptoms: list

@app.post("/predict")
async def predict(data: PredictionRequest):
    # Create an input vector of 0s
    input_vector = [0] * len(symptom_list)
    
    # Set 1 if the symptom provided by user matches our list
    for s in data.symptoms:
        # Standardize symptom names (lowercase and underscores)
        clean_s = s.strip().lower().replace(' ', '_')
        if clean_s in symptom_list:
            index = symptom_list.index(clean_s)
            input_vector[index] = 1
            
    prediction = model.predict([input_vector])[0]
    
    # CHANGED: Use "prediction" as the key to match predictController.js
    return {"prediction": prediction}

if __name__ == "__main__":
    import uvicorn
    # Use 127.0.0.1 for local development stability
    uvicorn.run(app, host="127.0.0.1", port=8000)