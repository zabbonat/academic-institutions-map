import pandas as pd
import json
import ast
import os
import argparse
import math
from tqdm import tqdm

def safe_eval(val):
    if val is None:
        return None
    # If it's already a container, return it
    if isinstance(val, (list, dict, set)):
        return val
    # If it's a string, try to eval it
    if isinstance(val, str):
        if val == "" or val.lower() == 'nan':
            return None
        try:
            return ast.literal_eval(val)
        except (ValueError, SyntaxError):
            return val
    # For other types, check for NaN safely
    try:
        if pd.isna(val):
            return None
    except (ValueError, TypeError):
        # If pd.isna fails (e.g. on an array), it's probably not a scalar NaN
        return val
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
        df = pd.read_csv(input_file, low_memory=False)
    print(f"Loaded {len(df)} records.")

    df = df.dropna(subset=['ror_lat', 'ror_lng'])
    print(f"Records after dropping missing coordinates: {len(df)}")

    os.makedirs('docs/data', exist_ok=True)
    index_data = []

    # To save space, we'll map types, ownerships, and countries to small integers
    type_map = {}
    own_map = {}
    country_map = {}
    
    def get_id(mapping, val):
        if not val: val = 'Unknown'
        if val not in mapping:
            mapping[val] = len(mapping)
        return mapping[val]

    print("Processing records into optimized format...")
    for _, row in tqdm(df.iterrows(), total=len(df)):
        ror_id = str(row.get('ror_id', ''))
        if not ror_id or pd.isna(ror_id) or ror_id == 'nan':
            ror_id = str(row.get('id', '')).split('/')[-1]
            if not ror_id or ror_id == 'nan':
                continue
            
        clean_id = ror_id.split('/')[-1]
        summary_stats = safe_eval(row.get('summary_stats'))
        if summary_stats is None: summary_stats = {}
        geo = safe_eval(row.get('geo'))
        if geo is None: geo = {}
        
        # Use full country name if available, fallback to code
        country_name = geo.get('country') or row.get('country_code') or 'Unknown'
        
        # Extract unique field names from topics
        topics = safe_eval(row.get('topics'))
        field_names = set()
        if isinstance(topics, list):
            for t in topics:
                field_name = t.get('field', {}).get('display_name')
                if field_name:
                    field_names.add(field_name)

        # Extract lineage (OpenAlex IDs)
        lineage = safe_eval(row.get('lineage'))
        lineage_ids = []
        if isinstance(lineage, list):
            for l_url in lineage:
                if isinstance(l_url, str):
                    l_id = l_url.split('/')[-1]
                    if l_id:
                        lineage_ids.append(l_id)

        own_llm = str(row.get('ownership_llm', '')).strip().lower()
        if own_llm == 'private': own = 'Private'
        elif own_llm == 'public': own = 'Public'
        elif own_llm == 'hybrid': own = 'Hybrid'
        else:
            own = str(row.get('ownership', '')).strip().capitalize()
            if not own or own.lower() == 'nan' or own == 'None':
                own = 'Unknown'
        
        inst_type_llm = str(row.get('institution_type_llm', '')).strip().lower()
        if inst_type_llm == 'company': inst_type = 'Company'
        elif inst_type_llm == 'university': inst_type = 'University'
        elif inst_type_llm == 'research_institute': inst_type = 'Research Institute'
        elif inst_type_llm == 'hospital': inst_type = 'Hospital'
        elif inst_type_llm == 'government_agency': inst_type = 'Government Agency'
        elif inst_type_llm == 'other': inst_type = 'Other'
        else:
            inst_type = str(row.get('institution_type', 'Unknown'))
            if inst_type == 'Facility':
                inst_type = 'Institute'
            elif inst_type.lower() == 'nan' or not inst_type:
                inst_type = 'Other'

        # Extract alternative names and acronyms
        alt_names = set()
        acronyms = safe_eval(row.get('display_name_acronyms'))
        if isinstance(acronyms, list):
            for ac in acronyms:
                if ac: alt_names.add(str(ac))
        
        alts = safe_eval(row.get('display_name_alternatives'))
        if isinstance(alts, list):
            for alt in alts:
                if alt: alt_names.add(str(alt))
        
        # Also check ror_names if present (it's often more detailed)
        ror_names = safe_eval(row.get('ror_names'))
        if isinstance(ror_names, list):
            for rn in ror_names:
                if isinstance(rn, dict) and rn.get('value'):
                    # Don't add if it's the same as main display name
                    val = str(rn.get('value'))
                    if val != str(row.get('display_name', '')):
                        alt_names.add(val)

        record = {
            "id": clean_id,
            "n": str(row.get('display_name', '')),
            "a": sorted(list(alt_names)) if alt_names else None,
            "c": get_id(country_map, country_name),
            "t": get_id(type_map, inst_type),
            "o": get_id(own_map, own),
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

    # Wrap data with metadata (mappings)
    final_output = {
        "types": {v: k for k, v in type_map.items()},
        "ownerships": {v: k for k, v in own_map.items()},
        "countries": {v: k for k, v in country_map.items()},
        "data": index_data
    }

    print("Saving docs/data/index.json...")
    with open("docs/data/index.json", "w", encoding="utf-8") as f:
        json.dump(final_output, f, separators=(',', ':')) # minified
        
    print(f"Data prep complete! Types: {len(type_map)}, Ownerships: {len(own_map)}, Countries: {len(country_map)}")
        
    print("Data preparation complete! Single optimized file created.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument('input_file', type=str, default='institution_classified_LAST.csv', nargs='?')
    args = parser.parse_args()
    process_data(args.input_file)
