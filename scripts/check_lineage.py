import pandas as pd, ast
df = pd.read_parquet('Affiliation_completeDATA.parquet')
# Search for IBM
ibm_rows = df[df['display_name'].str.contains('IBM', na=False)]
if not ibm_rows.empty:
    row = ibm_rows.iloc[0]
    print('Name:', row['display_name'])
    print('Lineage:', row['lineage'])
    print('Associated:', row['associated_institutions'])
else:
    print('No IBM found')
