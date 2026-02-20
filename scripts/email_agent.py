
import os
import base64
import json
import logging
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from email.mime.text import MIMEText
import google.generativeai as genai
from dotenv import load_dotenv

# Setup Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger("InboxManager")

# Load Config
load_dotenv()
GEMINI_KEY = os.getenv("GEMINI_API_KEY")

# Auth Config
SCOPES = ['https://www.googleapis.com/auth/gmail.modify']
TOKEN_FILE = 'token.json'

if GEMINI_KEY:
    genai.configure(api_key=GEMINI_KEY)
    model = genai.GenerativeModel('gemini-pro')
else:
    logger.error("GEMINI_API_KEY missing. Cannot classify emails.")
    exit(1)

def get_gmail_service():
    """Authenticates and returns the Gmail service."""
    creds = None
    if os.path.exists(TOKEN_FILE):
        creds = Credentials.from_authorized_user_file(TOKEN_FILE, SCOPES)
    
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            logger.error("Token invalid or expired. Please run auth_login.py again.")
            return None
            
    return build('gmail', 'v1', credentials=creds)

def analyze_email(subject, body):
    """Uses Gemini to classify email and generate a reply draft."""
    prompt = f"""
    You are the "Inbox Manager" for Gemini Man Roofing. 
    Analyze this incoming email.
    
    Email Subject: {subject}
    Email Body: {body}
    
    Task 1: Classify it into one of these categories:
    - "LEAD" (Homeowner asking for quote, inspection, damage)
    - "VENDOR" (Someone selling services, SEO, supplies)
    - "SPAM" (Junk, newsletters)
    - "OTHER"
    
    Task 2: If it is a LEAD, draft a helpful, professional reply.
    - Acknowledge their specific problem (hail, leak, etc).
    - Suggest a free drone inspection.
    - Ask for their address and best phone number.
    - Sign off as "Gemini Man Team".
    
    Task 3: Return ONLY a JSON object:
    {{
        "category": "LEAD", 
        "summary": "1 sentence summary", 
        "draft_reply": "The html content of the reply or null if not a lead"
    }}
    """
    
    try:
        response = model.generate_content(prompt)
        text = response.text.replace("```json", "").replace("```", "").strip()
        return json.loads(text)
    except Exception as e:
        logger.error(f"Gemini Analysis Error: {e}")
        return {"category": "ERROR", "summary": "Failed to analyze", "draft_reply": None}

def create_draft(service, user_id, message_body, recipient, subject):
    """Creates a draft email in Gmail."""
    try:
        message = MIMEText(message_body)
        message['to'] = recipient
        message['subject'] = f"Re: {subject}"
        
        raw_string = base64.urlsafe_b64encode(message.as_bytes()).decode()
        body = {'message': {'raw': raw_string}}
        
        draft = service.users().drafts().create(userId=user_id, body=body).execute()
        logger.info(f"✅ Draft created! Id: {draft['id']}")
        return draft
    except Exception as e:
        logger.error(f"Failed to create draft: {e}")
        return None

def main():
    service = get_gmail_service()
    if not service:
        return

    # Get Unread Messages
    results = service.users().messages().list(userId='me', q='is:unread').execute()
    messages = results.get('messages', [])

    if not messages:
        logger.info("No unread messages found.")
        return

    logger.info(f"Found {len(messages)} unread messages. Processing...")

    for msg in messages:
        try:
            full_msg = service.users().messages().get(userId='me', id=msg['id']).execute()
            payload = full_msg['payload']
            headers = payload.get('headers', [])
            
            subject = next((h['value'] for h in headers if h['name'] == 'Subject'), "No Subject")
            from_email = next((h['value'] for h in headers if h['name'] == 'From'), "Unknown")
            
            # Simple body extraction (can be improved for HTML/Multipart)
            snippet = full_msg.get('snippet', '')
            
            logger.info(f" Analyzing received email: {subject}")
            
            # AI Analysis
            analysis = analyze_email(subject, snippet)
            category = analysis.get("category", "UNKNOWN")
            
            logger.info(f" -> Classification: {category}")
            
            # Action: Label & Draft
            if category == 'LEAD' and analysis.get("draft_reply"):
                create_draft(service, 'me', analysis['draft_reply'], from_email, subject)
                logger.info(" -> Lead detected! Support draft created.")
            
            # Mark as read (optional, keeping unread for safety for now)
            # service.users().messages().modify(userId='me', id=msg['id'], body={'removeLabelIds': ['UNREAD']}).execute()
            
        except Exception as e:
            logger.error(f"Error processing message {msg['id']}: {e}")

if __name__ == '__main__':
    main()
