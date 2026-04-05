import pandas as pd
from sklearn.ensemble import RandomForestClassifier
import joblib

# 1. Load Data
data = pd.read_csv('master_dataset.csv')

# 2. Extract Symptoms (The columns between Disease and Description)
symptom_cols = [c for c in data.columns if 'Symptom' in c]
all_symptoms = pd.unique(data[symptom_cols].values.ravel('K'))
symptom_list = sorted([str(s).strip().lower() for s in all_symptoms if str(s) != 'nan'])

# 3. Create Binary Training Matrix
X = []
for _, row in data.iterrows():
    row_symptoms = [str(s).strip().lower() for s in row[symptom_cols].values]
    X.append([1 if s in row_symptoms else 0 for s in symptom_list])

y = data['Disease'].str.strip()

# 4. Train Model
model = RandomForestClassifier(n_estimators=150, random_state=42)
model.fit(X, y)

# 5. Create Metadata Dictionaries
# This maps the disease name directly to its info from the same row
desc_dict = data.groupby('Disease')['Description'].first().to_dict()
prec_cols = [c for c in data.columns if 'Precaution' in c]
prec_dict = data.groupby('Disease')[prec_cols].first().apply(lambda x: x.dropna().tolist(), axis=1).to_dict()

# 6. Save the 4 core files
import os
if not os.path.exists('models'): os.makedirs('models')

joblib.dump(model, 'models/rural_doc_model.pkl')
joblib.dump(symptom_list, 'models/symptom_list.pkl')
joblib.dump(desc_dict, 'models/description_data.pkl')
joblib.dump(prec_dict, 'models/precaution_data.pkl')

print("✅ Step 1 Complete: 4 model files generated in /models folder.")