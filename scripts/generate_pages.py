
import json
import os

# Configuration
TEMPLATE_PATH = "templates/city-template.html"
DATA_PATH = "locations.json"
OUTPUT_DIR = "locations"

def generate_pages():
    # 1. Load Data
    try:
        with open(DATA_PATH, 'r', encoding='utf-8') as f:
            locations = json.load(f)
    except FileNotFoundError:
        print(f"Error: {DATA_PATH} not found.")
        return

    # 2. Load Template
    try:
        with open(TEMPLATE_PATH, 'r', encoding='utf-8') as f:
            template_content = f.read()
    except FileNotFoundError:
        print(f"Error: {TEMPLATE_PATH} not found.")
        return

    # Ensure output directory exists
    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)

    count = 0
    print(f"Generating pages for {len(locations)} locations...")

    # 3. Generate Pages
    for loc in locations:
        city = loc.get("city", "Unknown")
        state = loc.get("state", "TX")
        county = loc.get("county", "Unknown")
        last_storm = loc.get("last_storm_date", "Recent")
        hail_size = loc.get("hail_size", "Large")
        zip_codes = ", ".join(loc.get("zip_codes", []))
        
        # Create Slug (e.g., plano-roofing.html)
        slug = f"{city.lower().replace(' ', '-')}-roofing.html"
        output_path = os.path.join(OUTPUT_DIR, slug)

        # Replace Placeholders
        page_content = template_content
        page_content = page_content.replace("{{City}}", city)
        page_content = page_content.replace("{{State}}", state)
        page_content = page_content.replace("{{County}}", county)
        page_content = page_content.replace("{{LastStormDate}}", last_storm)
        page_content = page_content.replace("{{HailSize}}", hail_size)
        page_content = page_content.replace("{{ZipCodes}}", zip_codes)
        
        # Determine relative path back to root assets
        # Since files are in /locations/, we need ../
        # The template already has ../index.css, etc. So no change needed if depth is 1.

        # Write File
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(page_content)
        
        print(f"Created: {output_path}")
        count += 1

    print("-" * 30)
    print(f"Successfully generated {count} pages in '{OUTPUT_DIR}/'.")

if __name__ == "__main__":
    generate_pages()
