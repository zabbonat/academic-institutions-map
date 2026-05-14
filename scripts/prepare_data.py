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
    return val

def process_data(input_csv):
    print(f"Loading data from {input_csv}...")
    df = pd.read_csv(input_csv)
    print(f"Loaded {len(df)} records.")

    # Drop records without coordinates
    df = df.dropna(subset=['ror_lat', 'ror_lng'])
    print(f"Records after dropping missing coordinates: {len(df)}")

    # Ensure output directories exist
    os.makedirs('docs/data/institutions', exist_ok=True)

    index_data = []
    search_docs = []

    print("Processing records...")
    for _, row in tqdm(df.iterrows(), total=len(df)):
        ror_id = str(row.get('ror_id', ''))
        if not ror_id or pd.isna(ror_id) or ror_id == 'nan':
            # Use OpenAlex id as fallback for ror_id if not present, to ensure uniqueness
            # or just skip. The prompt mentions {ror_id}.json so we need a valid identifier
            ror_id = str(row.get('id', '')).split('/')[-1]
            if not ror_id or ror_id == 'nan':
                continue
            
        # Clean up the ror_id for filenames (e.g., https://ror.org/03yrm5c26 -> 03yrm5c26)
        clean_id = ror_id.split('/')[-1]

        # Parse complex columns
        summary_stats = safe_eval(row.get('summary_stats')) or {}
        topics = safe_eval(row.get('topics')) or []
        x_concepts = safe_eval(row.get('x_concepts')) or []
        counts_by_year = safe_eval(row.get('counts_by_year')) or []
        associated_institutions = safe_eval(row.get('associated_institutions')) or []
        ids = safe_eval(row.get('ids')) or {}
        
        display_name_alternatives = safe_eval(row.get('display_name_alternatives')) or []
        display_name_acronyms = safe_eval(row.get('display_name_acronyms')) or []

        # Get top 10 topics and concepts
        top_topics = sorted(topics, key=lambda x: x.get('count', 0), reverse=True)[:10] if isinstance(topics, list) else []
        top_concepts = sorted(x_concepts, key=lambda x: x.get('score', 0), reverse=True)[:10] if isinstance(x_concepts, list) else []

        h_index = summary_stats.get('h_index')
        cited_by_count = clean_float(row.get('cited_by_count'))
        works_count = clean_float(row.get('works_count'))

        # Prepare index record (lightweight)
        index_record = {
            "ror_id": clean_id,
            "display_name": str(row.get('display_name', '')),
            "country_code": str(row.get('country_code', '')),
            "institution_type": str(row.get('institution_type', 'Unknown')),
            "ror_lat": clean_float(row.get('ror_lat')),
            "ror_lng": clean_float(row.get('ror_lng')),
            "works_count": works_count,
            "h_index": clean_float(h_index),
            "cited_by_count": cited_by_count
        }
        index_data.append(index_record)

        # Prepare search doc
        search_doc = {
            "ror_id": clean_id,
            "display_name": str(row.get('display_name', '')),
            "alternatives": display_name_alternatives,
            "acronyms": display_name_acronyms,
            "country_code": str(row.get('country_code', '')),
            "institution_type": str(row.get('institution_type', 'Unknown'))
        }
        search_docs.append(search_doc)

        # Prepare detailed institution record
        detail_record = {
            "id": str(row.get('id', '')),
            "ror": str(row.get('ror', '')),
            "ror_id": clean_id,
            "display_name": str(row.get('display_name', '')),
            "country_code": str(row.get('country_code', '')),
            "institution_type": str(row.get('institution_type', 'Unknown')),
            "ror_lat": clean_float(row.get('ror_lat')),
            "ror_lng": clean_float(row.get('ror_lng')),
            "works_count": works_count,
            "cited_by_count": cited_by_count,
            "summary_stats": summary_stats,
            "topics": top_topics,
            "x_concepts": top_concepts,
            "counts_by_year": counts_by_year,
            "associated_institutions": associated_institutions,
            "ids": ids,
            "homepage_url": str(row.get('homepage_url', '')) if pd.notna(row.get('homepage_url')) else None,
            "image_thumbnail_url": str(row.get('image_thumbnail_url', '')) if pd.notna(row.get('image_thumbnail_url')) else None,
            "wikipedia_url": str(row.get('wikipedia_url', '')) if pd.notna(row.get('wikipedia_url')) else None,
            "display_name_alternatives": display_name_alternatives,
            "display_name_acronyms": display_name_acronyms
        }

        # Write detail record
        with open(f"docs/data/institutions/{clean_id}.json", "w", encoding="utf-8") as f:
            json.dump(detail_record, f, ensure_ascii=False)

    print("Saving index.json...")
    with open("docs/data/index.json", "w", encoding="utf-8") as f:
        json.dump(index_data, f, ensure_ascii=False)

    print("Saving search_docs.json...")
    with open("docs/data/search_docs.json", "w", encoding="utf-8") as f:
        json.dump(search_docs, f, ensure_ascii=False)
        
    print("Data preparation complete!")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Prepare data for static map website.')
    parser.add_argument('input_csv', type=str, help='Path to the input CSV file', default='institution_classified_1405.csv', nargs='?')
    args = parser.parse_args()
    process_data(args.input_csv)
