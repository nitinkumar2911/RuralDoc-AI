import pandas as pd
from sklearn.ensemble import RandomForestClassifier
import joblib
import os

# 1. Load the dataset
df = pd.read_csv('dataset.csv')

# 2. Preprocessing: Flatten the symptoms
# We take the Disease and combine all Symptom columns into one long list
cols = [c for c in df.columns if 'Symptom' in c]
df_melted = df.melt(id_vars=['Disease'], value_vars=cols, value_name='Symptom')

# Remove empty rows and clean whitespace
df_melted = df_melted.dropna(subset=['Symptom'])
df_melted['Symptom'] = df_melted['Symptom'].str.strip().str.replace(' ', '_')

# 3. Create Binary Matrix (One-Hot Encoding)
# This creates a column for every unique symptom in your dataset
df_pivot = pd.get_dummies(df_melted.set_index('Disease')['Symptom']).groupby(level=0).max().reset_index()

# 4. Split Features and Target
X = df_pivot.drop('Disease', axis=1)
y = df_pivot['Disease']

# 5. Train the Model
print(f"Training on {len(X.columns)} unique symptoms for {len(y.unique())} diseases...")
model = RandomForestClassifier(n_estimators=100, random_state=42)
model.fit(X, y)

# 6. Save Outputs
if not os.path.exists('models'):
    os.makedirs('models')

joblib.dump(model, 'models/rural_doc_model.pkl')
joblib.dump(list(X.columns), 'models/symptom_list.pkl')

print("✅ Success: AI Brain Trained and Saved!")