import os
import time
import pandas as pd
import argparse
from datetime import datetime
from hailtrace_client import search_recent_hail
from automate_outreach import send_email, normalize_lead

# Configuration
MONITOR_INTERVAL = 3600 * 4  # Check every 4 hours
MIN_HAIL_SIZE = 1.0          # Trigger alert for 1.0 inch+ hail
TARGET_CITY = "Dallas"       # Default target market
TARGET_COORDS = (32.7767, -96.7970) # Dallas Lat/Lon

def monitor_storms(leads_file="contractor_leads.csv", dry_run=True):
    print(f"--- STORM MONITOR ACTIVE ---")
    print(f"Watching: {TARGET_CITY} ({TARGET_COORDS})")
    print(f"Trigger: Hail >= {MIN_HAIL_SIZE} inches")
    print("-----------------------------------")

    # Load Leads
    try:
        df = pd.read_csv(leads_file)
        print(f"[INFO] Loaded {len(df)} leads for potential activation.")
    except Exception as e:
        print(f"[ERROR] Could not load leads file: {e}")
        return

    while True:
        print(f"\n[SCAN] Checking HailTrace at {datetime.now().strftime('%H:%M:%S')}...")
        
        # Check for storms in the last 24 hours (1 day)
        events = search_recent_hail(
            lat=TARGET_COORDS[0], 
            lon=TARGET_COORDS[1], 
            days_back=1, 
            min_size=MIN_HAIL_SIZE
        )

        if events:
            latest_storm = events[0]
            storm_date = latest_storm['date']
            hail_size = latest_storm['size']
            
            print(f"[ALERT] STORM DETECTED! {hail_size} inch hail detected on {storm_date}!")
            
            # TRIGGER PROTOCOL
            activate_response_protocol(df, latest_storm, dry_run)
            
            # Sleep longer to avoid re-triggering for same storm immediately
            # In production, we'd track 'last_processed_storm_date' to prevent duplicates
            print("[INFO] Protocol Activated. Sleeping for 12 hours.")
            time.sleep(3600 * 12)
        else:
            print("[CLEAR] No new severe hail detected. Standing by.")
            time.sleep(MONITOR_INTERVAL)

def activate_response_protocol(df, storm_data, dry_run):
    """
    Sends 'Neighbor Alert' emails to leads in the affected area.
    """
    print("\n>>> INITIATING REAL-TIME RESPONSE SEQUENCE <<<")
    
    # Custom Context for the Email
    # We inject this into the lead data so automate_outreach can use it
    # Note: automate_outreach might need a slight tweak to accept external context override
    # For now, we will perform the send loop here directly to have full control.
    
    count = 0
    BATCH_LIMIT = 50 # Start small per storm event
    
    for index, row in df.iterrows():
        if count >= BATCH_LIMIT and dry_run:
            print("[STOP] Batch limit reached for test.")
            break
            
        lead = normalize_lead(row)
        
        # Simple Geofilter: Check if lead city matches Target (MVP)
        # Ideally, we calculate distance from storm shape
        if TARGET_CITY.lower() not in lead['city'].lower() and "dallas" not in lead['city'].lower():
            continue
            
        # Customize the 'Lead' object with storm info for the prompt
        # We are hacking the 'step' parameter to pass a custom prompt trigger if we wanted,
        # but automate_outreach expects 'day1', 'day3' etc.
        # Let's send a 'day1' but we know the prompt says "recent storms".
        
        print(f"   -> Targeting {lead['name']} in {lead['city']}...")
        
        # We call the existing send_email logic
        success = send_email(lead, step="day1", dry_run=dry_run)
        if success:
            count += 1
            if not dry_run:
                time.sleep(3) # Jitter

    print(f"\n[REPORT] Sent {count} Storm Alert emails.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--file", default="contractor_leads.csv")
    parser.add_argument("--live", action="store_true", help="Enable LIVE sending (disable dry run)")
    args = parser.parse_args()
    
    monitor_storms(leads_file=args.file, dry_run=not args.live)
