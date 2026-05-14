import pandas as pd, ast
df = pd.read_parquet('Affiliation_completeDATA.parquet')
ibm_rows = df[df['display_name'].str.contains('IBM', na=False)]
for _, row in ibm_rows.head(10).iterrows():
    print(f"{row['display_name']}: {row['lineage']}")
