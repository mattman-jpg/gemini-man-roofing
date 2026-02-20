import os
import json
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from dotenv import load_dotenv

# Load Environment Variables
load_dotenv()

# Scopes needed for our Agents
SCOPES = [
    'https://www.googleapis.com/auth/gmail.modify',       # To read/send emails
    'https://www.googleapis.com/auth/contacts',           # To save contacts
    'https://www.googleapis.com/auth/userinfo.profile',   # To confirm identity
    'https://www.googleapis.com/auth/postmaster.readonly' # For Reputation Monitor
]

CREDENTIALS_FILE = 'credentials.json'
TOKEN_FILE = 'token.json'

def create_credentials_file():
    """Generates a credentials.json from .env variables if not present."""
    if os.path.exists(CREDENTIALS_FILE):
        return

    client_id = os.getenv('GOOGLE_CLIENT_ID')
    client_secret = os.getenv('GOOGLE_CLIENT_SECRET')

    if not client_id or not client_secret:
        print("❌ Error: GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET missing in .env")
        return

    creds_data = {
        "installed": {
            "client_id": client_id,
            "project_id": "gemini-man-roofing", # Placeholder, relies on ID
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
            "client_secret": client_secret,
            "redirect_uris": ["http://localhost:8090"]
        }
    }

    with open(CREDENTIALS_FILE, 'w') as f:
        json.dump(creds_data, f, indent=4)
    print(f"✅ Generated temporary {CREDENTIALS_FILE} from .env")

def authenticate():
    """Shows the browser popup to login."""
    creds = None
    
    # Load existing token
    if os.path.exists(TOKEN_FILE):
        creds = Credentials.from_authorized_user_file(TOKEN_FILE, SCOPES)

    # Validate or Refresh
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            print("🔄 Refreshing expired token...")
            creds.refresh(Request())
        else:
            print("🔐 Launching Browser for Login...")
            create_credentials_file()
            
            if not os.path.exists(CREDENTIALS_FILE):
                print("❌ Cannot find credentials.json. Please check .env")
                return

            flow = InstalledAppFlow.from_client_secrets_file(
                CREDENTIALS_FILE, SCOPES)
            # Force port 8090 (Port 8080 was blocked)
            creds = flow.run_local_server(port=8090)
        
        # Save the new token
        with open(TOKEN_FILE, 'w') as token:
            token.write(creds.to_json())
            print(f"✅ Token saved to {TOKEN_FILE}")

    print("\n🎉 Authentication Successful!")
    print("Your agents (Gmail & People) are now authorized.")

if __name__ == '__main__':
    authenticate()
