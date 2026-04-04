import os, joblib, uvicorn
from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# Load Smart Models
model = joblib.load('models/rural_doc_model.pkl')
symptom_list = joblib.load('models/symptom_list.pkl')
description_data = joblib.load('models/description_data.pkl')
precaution_data = joblib.load('models/precaution_data.pkl')

class PredictionRequest(BaseModel):
    symptoms: list

@app.post("/predict")
async def predict(data: PredictionRequest):
    input_vector = [0] * len(symptom_list)
    for s in data.symptoms:
        clean_s = s.strip().lower().replace(' ', '_')
        if clean_s in symptom_list:
            input_vector[symptom_list.index(clean_s)] = 1
            
    disease = model.predict([input_vector])[0]
    return {
        "prediction": str(disease),
        "description": description_data.get(disease, "No info found."),
        "precautions": precaution_data.get(disease, ["Consult a doctor."])
    }

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))
    uvicorn.run(app, host="0.0.0.0", port=port)