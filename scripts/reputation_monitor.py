import os
import logging
import json
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from dotenv import load_dotenv

# Setup Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger("ReputationGuard")

load_dotenv()

# Postmaster Tools API is tricky; it often requires a Service Account + Domain Verification DNS record.
# However, we will try to use the OAuth User credentials if they have access.
SCOPES = ['https://www.googleapis.com/auth/postmaster.readonly']
TOKEN_FILE = 'token.json'

def get_postmaster_service():
    """Authenticates and returns the Postmaster Tools service."""
    creds = None
    if os.path.exists(TOKEN_FILE):
        creds = Credentials.from_authorized_user_file(TOKEN_FILE, SCOPES)
    
    # If the token from 'auth_login.py' didn't have the postmaster scope, 
    # we might fail here. We usually need to re-auth with the extra scope.
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            try:
                creds.refresh(Request())
            except Exception:
                logger.error("Token refresh failed. Scopes might have changed.")
                return None
        else:
            logger.error("No valid credentials found. Please run auth_login.py with Postmaster scopes.")
            return None
            
    return build('gmailpostmastertools', 'v1beta1', credentials=creds)

def check_domain_health(domain_name):
    service = get_postmaster_service()
    if not service:
        return

    query = f"domains/{domain_name}/trafficStats"
    
    # Date logic would go here to get last 7 days
    # For now, we list domains to verify access
    try:
        domains = service.domains().list().execute()
        logger.info(f"Verified Domains: {domains}")
        
        # Real stats implementation requires a verified domain in Postmaster Tools UI
        # This is a placeholder for the actual API call once verified:
        # stats = service.domains().trafficStats().list(parent=f"domains/{domain_name}").execute()
        
        logger.info(f"✅ Connection to Postmaster Tools successful for {domain_name}")
        logger.info("ℹ️ NOTE: To see real data, verify this domain in https://postmaster.google.com/")
        
        return True

    except Exception as e:
        logger.error(f"Postmaster Tools API Error: {e}")
        logger.warning("Did you enable 'Postmaster Tools API' in Google Cloud Console?")
        return False

if __name__ == '__main__':
    # Default to the domain in the email address
    domain = "geminimanroofing.com" 
    logger.info(f"🔍 Checking Reputation for: {domain}")
    check_domain_health(domain)
