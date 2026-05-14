import pandas as pd
import json
import ast
import os
import argparse
import math
from tqdm import tqdm

def safe_eval(val):
    if pd.isna(val) or val == "" or val is None:
        return None
    if isinstance(val, str):
        try:
            return ast.literal_eval(val)
        except (ValueError, SyntaxError):
            return None
    return val

def clean_float(val):
    if pd.isna(val) or math.isnan(val) or math.isinf(val):
        return None
    return int(val) if val.is_integer() else round(val, 4)

def process_data(input_file):
    print(f"Loading data from {input_file}...")
    if input_file.endswith('.parquet'):
        df = pd.read_parquet(input_file)
    else:
        df = pd.read_csv(input_file)
    print(f"Loaded {len(df)} records.")

    df = df.dropna(subset=['ror_lat', 'ror_lng'])
    print(f"Records after dropping missing coordinates: {len(df)}")

    os.makedirs('docs/data', exist_ok=True)
    index_data = []

    print("Processing records into a single optimized file...")
    for _, row in tqdm(df.iterrows(), total=len(df)):
        ror_id = str(row.get('ror_id', ''))
        if not ror_id or pd.isna(ror_id) or ror_id == 'nan':
            ror_id = str(row.get('id', '')).split('/')[-1]
            if not ror_id or ror_id == 'nan':
                continue
            
        clean_id = ror_id.split('/')[-1]
        summary_stats = safe_eval(row.get('summary_stats')) or {}
        
        # Extract unique field names from topics (just for filtering, no counts)
        topics = safe_eval(row.get('topics')) or []
        field_names = set()
        if isinstance(topics, list):
            for t in topics:
                field_name = t.get('field', {}).get('display_name')
                if field_name:
                    field_names.add(field_name)

        # Extract lineage (OpenAlex IDs)
        lineage = safe_eval(row.get('lineage')) or []
        lineage_ids = []
        if isinstance(lineage, list):
            for l_url in lineage:
                if isinstance(l_url, str):
                    l_id = l_url.split('/')[-1]
                    if l_id:
                        lineage_ids.append(l_id)

        own = str(row.get('ownership', '')).strip().capitalize()
        if not own or own.lower() == 'nan' or own == 'None':
            own = 'Unknown'

        record = {
            "id": clean_id,
            "n": str(row.get('display_name', '')),
            "c": str(row.get('country_code', '')),
            "t": str(row.get('institution_type', 'Unknown')),
            "o": own,
            "lat": clean_float(row.get('ror_lat')),
            "lng": clean_float(row.get('ror_lng')),
            "w": clean_float(row.get('works_count')),
            "cb": clean_float(row.get('cited_by_count')),
            "h": clean_float(summary_stats.get('h_index')),
            "u": str(row.get('homepage_url', '')) if pd.notna(row.get('homepage_url')) else None,
            "wiki": str(row.get('wikipedia_url', '')) if pd.notna(row.get('wikipedia_url')) else None,
            "f": sorted(field_names) if field_names else None,
            "l": lineage_ids if lineage_ids else None
        }
        
        # Remove nulls to save space
        record = {k: v for k, v in record.items() if v is not None and v != '' and v != 'nan'}
        index_data.append(record)

    print("Saving docs/data/index.json...")
    with open("docs/data/index.json", "w", encoding="utf-8") as f:
        json.dump(index_data, f, separators=(',', ':')) # minified
        
    print("Data preparation complete! Single optimized file created.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument('input_file', type=str, default='Affiliation_completeDATA.parquet', nargs='?')
    args = parser.parse_args()
    process_data(args.input_file)
