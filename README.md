# Academic Institutions Map

A static website for visualizing and exploring ~110,000 academic institutions worldwide, enriched with OpenAlex and ROR metadata.

## Features
- Interactive fullscreen Leaflet map with clustered markers.
- Entirely client-side, zero backend required.
- Fast, full-text search powered by FlexSearch.
- Detailed institution profiles with charts (Chart.js) and key metrics (works count, citations, h-index).
- Filter by institution type, country, and minimum works count.

## Data Sources
- **[OpenAlex](https://openalex.org/)**: Open catalog of the global research system.
- **[ROR (Research Organization Registry)](https://ror.org/)**: Community-led registry of open identifiers for research organizations.

## Regenerating the Data
The website relies on pre-processed JSON files generated from a source pandas DataFrame.

1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
2. Run the preparation script:
   ```bash
   python scripts/prepare_data.py path/to/your/institution_classified.csv
   ```
   This will output the lightweight index, search documents, and full institution JSON files into the `docs/data/` directory.

## License
MIT License.
