import pandas as pd
from sklearn.ensemble import RandomForestClassifier
import joblib
import os

# 1. Load all four datasets
# Ensure these files are in the same folder as this script
df = pd.read_csv('dataset.csv')
descriptions = pd.read_csv('symptom_Description.csv')
precautions = pd.read_csv('symptom_precaution.csv')

# 2. Clean and Standardize Symptom Names
# This removes leading/trailing spaces and replaces middle spaces with underscores
for col in df.columns[1:]:
    df[col] = df[col].str.strip().str.lower().str.replace(' ', '_')

# 3. Create a Master Symptom List (The AI's Vocabulary)
all_symptoms = pd.unique(df.iloc[:, 1:].values.ravel('K'))
symptom_list = sorted([s for s in all_symptoms if str(s) != 'nan'])

# 4. Transform Data into a Binary Matrix (The "Smart" Format)
X_data = []
for i in range(len(df)):
    row_symptoms = df.iloc[i, 1:].values
    # Create a 1/0 vector: 1 if the symptom is present in this row
    binary_vector = [1 if s in row_symptoms else 0 for s in symptom_list]
    X_data.append(binary_vector)

X = pd.DataFrame(X_data, columns=symptom_list)
y = df['Disease'].str.strip()

# 5. Train the Model with Random Forest
# n_estimators=150 ensures 150 'trees' vote to prevent "Wrong Results"
model = RandomForestClassifier(n_estimators=150, random_state=42, criterion='entropy')
model.fit(X, y)

# 6. Prepare Metadata for the API
if not os.path.exists('models'):
    os.makedirs('models')

# Create dictionaries for instant lookup of descriptions and precautions
desc_dict = descriptions.set_index('Disease')['Description'].to_dict()
prec_dict = precautions.set_index('Disease').apply(lambda x: x.dropna().tolist(), axis=1).to_dict()

# 7. Save everything
joblib.dump(model, 'models/rural_doc_model.pkl')
joblib.dump(symptom_list, 'models/symptom_list.pkl')
joblib.dump(desc_dict, 'models/description_data.pkl')
joblib.dump(prec_dict, 'models/precaution_data.pkl')

print(f"✅ Success! Trained on {len(symptom_list)} symptoms.")