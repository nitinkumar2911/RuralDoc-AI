import pandas as pd
from sklearn.ensemble import RandomForestClassifier
import joblib
import os

# Load all 4 datasets
df = pd.read_csv('dataset.csv')
descriptions = pd.read_csv('symptom_Description.csv')
precautions = pd.read_csv('symptom_precaution.csv')

# Standardize symptoms: lowercase and underscores
for col in df.columns[1:]:
    df[col] = df[col].str.strip().str.lower().str.replace(' ', '_')

# Create master symptom list
all_symptoms = pd.unique(df.iloc[:, 1:].values.ravel('K'))
symptom_list = sorted([s for s in all_symptoms if str(s) != 'nan'])

# Convert data to Binary Matrix
X_data = []
for i in range(len(df)):
    row_symptoms = df.iloc[i, 1:].values
    binary_vector = [1 if s in row_symptoms else 0 for s in symptom_list]
    X_data.append(binary_vector)

X = pd.DataFrame(X_data, columns=symptom_list)
y = df['Disease'].str.strip()

# Train Random Forest (Accuracy Fix)
model = RandomForestClassifier(n_estimators=150, random_state=42)
model.fit(X, y)

# Save everything to 'models' folder
if not os.path.exists('models'): os.makedirs('models')
joblib.dump(model, 'models/rural_doc_model.pkl')
joblib.dump(symptom_list, 'models/symptom_list.pkl')
joblib.dump(descriptions.set_index('Disease')['Description'].to_dict(), 'models/description_data.pkl')
joblib.dump(precautions.set_index('Disease').apply(lambda x: x.dropna().tolist(), axis=1).to_dict(), 'models/precaution_data.pkl')

print("✅ Training Complete! 4 Datasets Integrated.")