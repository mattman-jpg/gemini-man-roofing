import os
import logging
from dotenv import load_dotenv

# Load environment variables from .env file (if present)
load_dotenv()

from fastapi import FastAPI, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
from pydantic import BaseModel
from google.cloud import firestore
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail

# Configure Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("HailstormBackend")

# Initialize App
app = FastAPI(title="Project Hailstorm API", version="3.0.0")

# Enable CORS (Cross-Origin Resource Sharing)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

# Initialize Clients
# Note: Google Cloud libraries automatically find credentials in the environment
try:
    db = firestore.Client()
except Exception as e:
    logger.warning(f"Firestore Client could not be initialized (Local Dev?): {e}")
    db = None

# Data Models
class Lead(BaseModel):
    name: str
    email: str
    address: str
    hail_size: float = 0.0
    campaign_id: str = "DEFAULT"
    preferred_date: Optional[str] = None
    preferred_time: Optional[str] = None

@app.get("/")
def read_root():
    return {"status": "online", "system": "Project Hailstorm V3"}

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.post("/submit-lead")
async def submit_lead(lead: Lead, background_tasks: BackgroundTasks):
    """
    Receives a lead, saves to Firestore, and triggers an email.
    """
    logger.info(f"Received lead: {lead.email}")

    # 1. Save to Firestore
    doc_id = "N/A"
    if db:
        try:
            doc_ref = db.collection('leads').document()
            doc_ref.set({
                'name': lead.name,
                'email': lead.email,
                'address': lead.address,
                'hail_size': lead.hail_size,
                'campaign_id': lead.campaign_id,
                'status': 'PENDING',
                'created_at': firestore.SERVER_TIMESTAMP
            })
            doc_id = doc_ref.id
            logger.info(f"Saved to Firestore: {doc_id}")
        except Exception as e:
            logger.error(f"Firestore Error: {e}")
            # We don't stop execution here, we try to send the email anyway
            # but in a real system we might return 500
    
    
    # 2. Trigger Background Email
    background_tasks.add_task(process_email, lead)

    return {"status": "accepted", "id": doc_id}

def process_email(lead: Lead):
    """
    Sends the email via SendGrid.
    """
    api_key = os.environ.get('SENDGRID_API_KEY')
    if not api_key:
        logger.error("SENDGRID_API_KEY not found in environment variables.")
        return

    try:
        # Construct Email Content
        content = f"<strong>New Lead: {lead.name}</strong><br>"
        content += f"Address: {lead.address}<br>"
        content += f"Email: {lead.email}<br>"
        if lead.preferred_date:
            content += f"<br><strong>Requested Appointment:</strong><br>"
            content += f"Date: {lead.preferred_date}<br>"
            content += f"Time: {lead.preferred_time}<br>"
        
        message = Mail(
            from_email='help@geminimanroofing.com',
            to_emails='help@geminimanroofing.com', # Send alert to Business Owner
            subject=f'New Inspection Request: {lead.address}',
            html_content=content
        )
        # Optional: Send separate confirmation to lead (future enhancement)
        
        sg = SendGridAPIClient(api_key)
        response = sg.send(message)
        
        logger.info(f"Email sent to {lead.email}. Status Code: {response.status_code}")
        
    except Exception as e:
        logger.error(f"Failed to send email to {lead.email}: {e}")
