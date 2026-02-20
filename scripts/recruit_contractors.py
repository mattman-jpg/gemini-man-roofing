import requests
import csv
import time
import json

# Configuration
API_KEY = "AIzaSyAJZh61--ULfvqcwB2XTTG4C84N--JZw1M" # Using the key found in your HTML
SEARCH_RADIUS = 10000 # 10km (~6 miles)
TARGET_CITIES = ["Frisco, TX", "Plano, TX", "McKinney, TX"]
OUTPUT_FILE = "contractor_leads.csv"

def find_roofers(city):
    """
    Search for high-rated but reachable roofers.
    Status: 'OPERATIONAL'
    Rating: 4.0+ (Good work)
    User_Ratings_Total: < 50 (Hungry for work, not too big to ignore us)
    """
    url = "https://maps.googleapis.com/maps/api/place/textsearch/json"
    params = {
        "query": f"roofing contractor in {city}",
        "key": API_KEY
    }
    
    print(f"Searching in {city}...")
    response = requests.get(url, params=params)
    results = response.json().get('results', [])
    
    leads = []
    for place in results:
        rating = place.get('rating', 0)
        reviews = place.get('user_ratings_total', 0)
        
        # The "Sweet Spot" Strategy:
        # We want good roofers (4.0+) who are aggressive/hungry (<100 reviews).
        # Huge companies with 1000 reviews won't take a 50% split.
        if rating >= 4.0 and reviews < 100:
            leads.append({
                "Name": place.get('name'),
                "Address": place.get('formatted_address'),
                "Rating": rating,
                "Reviews": reviews,
                "PlaceID": place.get('place_id'),
                "Status": "New"
            })
    
    return leads

def get_phone_number(place_id):
    """
    Fetch details content to get the phone number.
    """
    url = "https://maps.googleapis.com/maps/api/place/details/json"
    params = {
        "place_id": place_id,
        "fields": "formatted_phone_number,website",
        "key": API_KEY
    }
    resp = requests.get(url, params=params)
    result = resp.json().get('result', {})
    return result.get('formatted_phone_number', 'N/A'), result.get('website', 'N/A')

def main():
    all_leads = []
    
    for city in TARGET_CITIES:
        roofers = find_roofers(city)
        
        # Enrich with Phone Numbers (Costs extra API credits, so we do it sparingly)
        for roofer in roofers:
            phone, website = get_phone_number(roofer['PlaceID'])
            roofer['Phone'] = phone
            roofer['Website'] = website
            all_leads.append(roofer)
            print(f"found: {roofer['Name']} ({phone})")
            time.sleep(0.5) # Be nice to the API
            
    # Save to CSV
    keys = ["Name", "Phone", "Website", "Rating", "Reviews", "Address", "City", "Status"]
    
    # Extract City from loop context or address logic (simplified here)
    for l in all_leads:
        l['City'] = l['Address'].split(',')[-2].strip().split(' ')[0] if ',' in l['Address'] else "Unknown"

    with open(OUTPUT_FILE, 'w', newline='', encoding='utf-8') as f:
        dict_writer = csv.DictWriter(f, fieldnames=keys, extrasaction='ignore')
        dict_writer.writeheader()
        dict_writer.writerows(all_leads)
        
    print(f"\nRECRUITMENT COMPLETE. Saved {len(all_leads)} potential partners to {OUTPUT_FILE}")
    print("Next Step: Upload this list to 'automate_outreach.py' found earlier to recruit them!")

if __name__ == "__main__":
    main()
