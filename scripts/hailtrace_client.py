import os
import requests
import json
import argparse
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("HAILTRACE_API_KEY")
APP_ID = os.getenv("HAILTRACE_APP_ID")
BASE_URL = "https://openapi.hailtrace.com"

if not API_KEY:
    print("[ERROR] HAILTRACE_API_KEY not found in .env")
    exit(1)

HEADERS = {
    "X-API-Key": API_KEY,
    "Content-Type": "application/json",
    "Accept": "application/json"
}

if APP_ID:
    HEADERS["X-APP-ID"] = APP_ID
else:
    print("[WARN] HAILTRACE_APP_ID not found. Request might fail if required.")

# Default Location: Dallas, TX
DEFAULT_LAT = 32.7767
DEFAULT_LON = -96.7970

def search_recent_hail(lat=DEFAULT_LAT, lon=DEFAULT_LON, days_back=1, min_size=1.0):
    """
    Search for hail events >= min_size inches in the last N days.
    """
    url = f"{BASE_URL}/weather_events/search"
    
    end_date = datetime.now()
    start_date = end_date - timedelta(days=days_back)
    
    payload = {
        "latitude": lat,
        "longitude": lon,
        "search_radius_mi": "25", # String as per spec [3..25]
        "start_date": start_date.strftime("%Y-%m-%d"),
        "end_date": end_date.strftime("%Y-%m-%d"),
        # Enum values from spec
        "weather_types": ["METEOROLOGIST_HAIL_SIZE", "ALGORITHM_HAIL_SIZE"], 
        "min_hail_size": min_size,
        "page_size": 100
    }
    
    print(f"[INFO] Scanning for Hail > {min_size}\" from {start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}...")
    
    try:
        response = requests.post(url, headers=HEADERS, json=payload)
        response.raise_for_status()
        data = response.json()
        
        results = data.get("results", [])
        
        # Filter/Process results
        valid_events = []
        for event in results:
            # Per schema: max_meteorologist_hail_size OR max_algorithm_hail_size
            hail_size = event.get('max_meteorologist_hail_size') or event.get('max_algorithm_hail_size') or 0
            
            if hail_size >= min_size:
                valid_events.append({
                    "date": event.get('date'),
                    "size": hail_size,
                    "wind": event.get('max_meteorologist_wind_speed_mph'),
                    "shapes_count": len(event.get('shapes', []))
                })
                
        print(f"[SUCCESS] Found {len(valid_events)} significant storm events.")
        for evt in valid_events:
            print(f"   -> [ALERT] {evt['date']}: {evt['size']} inch Hail (Wind: {evt.get('wind')} mph)")
            
        return valid_events
        
    except requests.exceptions.HTTPError as e:
        print(f"[ERROR] API Request Failed: {e}")
        try:
            print(f"Server Response: {e.response.text}")
        except:
            pass
        return []

def get_impact_history(lat, lon):
    url = f"{BASE_URL}/location/impact_history"
    params = {"latitude": lat, "longitude": lon}
    
    try:
        response = requests.get(url, headers=HEADERS, params=params)
        response.raise_for_status()
        data = response.json()
        
        print("\n[IMPACT HISTORY]")
        for event in data:
            print(f"   -> {event.get('date')}: {event.get('hail_size_inches')} in Hail, {event.get('wind_speed_mph')} mph Wind")
            
        return data
    except Exception as e:
        print(f"[ERROR] History Failed: {e}")
        return []

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--lat", type=float, default=DEFAULT_LAT, help="Latitude")
    parser.add_argument("--lon", type=float, default=DEFAULT_LON, help="Longitude")
    parser.add_argument("--days", type=int, default=365, help="Days to look back")
    args = parser.parse_args()
    
    print("--- HailTrace Intelligence ---")
    search_recent_hail(args.lat, args.lon, args.days)
