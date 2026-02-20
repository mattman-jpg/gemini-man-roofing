import os
import json
import time
import logging
from dotenv import load_dotenv

# Load environment variables (Twilio Config)
load_dotenv()

# Configure Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger("DispatchAgent")

# Mock Twilio Client (Replace with real 'from twilio.rest import Client' when live)
class MockTwilioClient:
    def __init__(self, sid, token):
        self.sid = sid
    
    def send_sms(self, to, body):
        logger.info(f"📱 SMS SENT to {to}: {body}")
        return "SM" + "12345abcdef"

def load_contractors():
    try:
        with open('contractors.json', 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        return []

def find_best_contractor(zip_code, contractors):
    """
    Filters by Zip Code and sorts by Rating (Highest first).
    """
    available = [c for c in contractors if zip_code in c.get('zip_codes', []) and c.get('status') == 'active']
    # Sort by rating descending
    available.sort(key=lambda x: x.get('rating', 0), reverse=True)
    return available

def dispatch_job(lead):
    """
    The core logic:
    1. Find contractors in lead's area.
    2. Send SMS blast.
    3. (In real life) Listen for webhook response.
    """
    logger.info(f"🚀 Dispatching Lead: {lead['address']} ({lead['city']})")
    
    contractors = load_contractors()
    matches = find_best_contractor("75024", contractors) # Hardcoded zip for demo
    
    if not matches:
        logger.warning(f"No active contractors found for {lead['city']}!")
        return

    # Simulate SMS Blast
    client = MockTwilioClient("SID", "TOKEN")
    
    msg_body = f"URGENT LEAD: {lead['city']}. Roof Inspection. Est Profit $4k. Reply YES to claim. First come first serve."
    
    # In V1, we text the TOP rated guy first. If no answer in 5 min, text the next.
    # User asked for "Blast" -> "First one responds". So we text all matches.
    
    for contractor in matches:
        logger.info(f"Trying {contractor['name']} (Rating: {contractor['rating']})...")
        client.send_sms(contractor['phone'], msg_body)
        
    logger.info("📡 Blast complete. Waiting for replies...")

if __name__ == "__main__":
    # Test Lead
    test_lead = {
        "name": "John Doe",
        "address": "123 Main St",
        "city": "Frisco",
        "phone": "555-123-4567"
    }
    dispatch_job(test_lead)
