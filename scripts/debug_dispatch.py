import os
import logging
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from scripts.dispatch_server import ContractorDispatcher

# Setup Logging to console
logging.basicConfig(level=logging.INFO)

print("Starting Debug Trace...")

try:
    dispatcher = ContractorDispatcher()
    print("Dispatch Initialized")
    
    # Reload contractors to be sure
    contractors = dispatcher.contractors
    print(f"Loaded {len(contractors)} contractors.")
    
    # Mock Lead
    lead = {
        "city": "Denver",
        "address": "123 Test St",
        "scope": "Hail Damage"
    }
    
    # Force Blast
    print("Attempting Blast...")
    job_id = "DEBUG-JOB-001"
    
    # We will override get_best_contractors to return ALL for this test
    # or just rely on the zip code logic if 'contractors.json' aligns.
    # Actually, dispatch_server.py lines 43 hardcoded "75024" for the zip match. 
    # That is likely the issue if no output or if it returns False gracefully.
    # But 500 means CRASH.
    
    success = dispatcher.blast_lead(job_id, lead)
    print(f"Blast Result: {success}")

except Exception as e:
    print(f"\nCRITICAL ERROR:\n{e}")
    import traceback
    traceback.print_exc()
