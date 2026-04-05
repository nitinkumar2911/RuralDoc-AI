import pandas as pd
import numpy as np

# 1. Load the four files
# Assuming filenames are: dataset.csv, description.csv, precaution.csv, severity.csv
df_main = pd.read_csv('dataset.csv')
df_desc = pd.read_csv('symptom_Description.csv')
df_prec = pd.read_csv('symptom_precaution.csv')
df_sever = pd.read_csv('Symptom-severity.csv')

# 2. CLEANING FUNCTION: Removes extra spaces and standardizes names
def clean_name(name):
    if pd.isna(name): return name
    return str(name).strip()

# Clean Disease names in all files to ensure they match during the merge
df_main['Disease'] = df_main['Disease'].apply(clean_name)
df_desc['Disease'] = df_desc['Disease'].apply(clean_name)
df_prec['Disease'] = df_prec['Disease'].apply(clean_name)

# 3. MERGING
# First, merge Description and Precaution into a metadata table
metadata = pd.merge(df_desc, df_prec, on='Disease', how='left')

# 4. Cleaning Symptoms in the main dataset (lowercase and underscores)
for col in df_main.columns[1:]:
    df_main[col] = df_main[col].str.strip().str.lower().str.replace(' ', '_')

# 5. Final Master Join
# We keep the main symptom rows and attach the description/precautions to every row
master_df = pd.merge(df_main, metadata, on='Disease', how='left')

# 6. Save the merged file
master_df.to_csv('master_dataset.csv', index=False)

print("✅ Master Dataset Created: 'master_dataset.csv'")
print(f"Total Rows: {len(master_df)}")
print(f"Columns: {master_df.columns.tolist()}")
