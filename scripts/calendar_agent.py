import os.path
import datetime
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

# If modifying these scopes, delete the file token.json.
SCOPES = [
    "https://www.googleapis.com/auth/calendar",
    "https://www.googleapis.com/auth/gmail.readonly"
]

CREDENTIALS_FILE = "credentials.json"
TOKEN_FILE = "token.json"

def get_services():
    """Authenticates and returns both Calendar and Gmail services."""
    creds = None
    if os.path.exists(TOKEN_FILE):
        try:
            creds = Credentials.from_authorized_user_file(TOKEN_FILE, SCOPES)
        except Exception:
            print("[WARN] Token invalid or scopes changed.")
            creds = None

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            try:
                creds.refresh(Request())
            except Exception as e:
                print(f"[ERROR] Refresh failed: {e}")
                creds = None
        
        if not creds:
            if not os.path.exists(CREDENTIALS_FILE):
                print(f"[ERROR] {CREDENTIALS_FILE} not found.")
                return None, None
                
            flow = InstalledAppFlow.from_client_secrets_file(CREDENTIALS_FILE, SCOPES)
            creds = flow.run_local_server(port=8090)
            
        with open(TOKEN_FILE, "w") as token:
            token.write(creds.to_json())

    try:
        calendar_service = build("calendar", "v3", credentials=creds)
        gmail_service = build("gmail", "v1", credentials=creds)
        return calendar_service, gmail_service
    except HttpError as err:
        print(f"[ERROR] Service build failed: {err}")
        return None, None

def check_inbox(gmail_service):
    """Scans unread emails for keywords."""
    print("[INFO] Scanning Inbox for new leads/replies...")
    try:
        # Query: Unread emails
        results = gmail_service.users().messages().list(userId='me', q='is:unread', maxResults=10).execute()
        messages = results.get('messages', [])

        if not messages:
            print("   -> No new unread messages.")
            return

        for msg in messages:
            txt = gmail_service.users().messages().get(userId='me', id=msg['id']).execute()
            snippet = txt.get('snippet', '')
            payload = txt.get('payload', {})
            headers = payload.get('headers', [])
            
            subject = next((h['value'] for h in headers if h['name'] == 'Subject'), "No Subject")
            sender = next((h['value'] for h in headers if h['name'] == 'From'), "Unknown")

            # Sanitize for Windows Console
            sender = sender.encode('ascii', 'ignore').decode()
            subject = subject.encode('ascii', 'ignore').decode()
            snippet = snippet.encode('ascii', 'ignore').decode()

            print(f"   [NEW] From: {sender} | Sub: {subject}")
            
            # Simple Keyword Matching
            keywords = ['book', 'schedule', 'inspection', 'roof', 'hail']
            if any(k in snippet.lower() for k in keywords) or any(k in subject.lower() for k in keywords):
                print(f"   ★ HOT LEAD DETECTED: {snippet[:50]}...")
                
                # 1. Log to File (Persistent Record)
                with open("hot_leads.txt", "a") as f:
                    f.write(f"{datetime.datetime.now()} | {sender} | {subject}\n")
                
                # 2. Create Gmail Draft (Safety First - Don't auto-send yet)
                try:
                    create_draft_reply(gmail_service, msg['id'], sender)
                except Exception as e:
                    print(f"   [ERROR] Could not create draft: {e}")

    except Exception as e:
        print(f"[ERROR] Gmail Scan failed: {e}")

def create_draft_reply(service, message_id, sender_email):
    """Creates a draft reply for the user to review."""
    from email.mime.text import MIMEText
    import base64
    
    reply_body = (
        "Hi,\n\n"
        "Thanks for reaching out! I've received your request for a roof inspection.\n"
        "I'm cc'ing Matt (Owner) to get this scheduled immediately.\n\n"
        "Best,\nGemini Man Assistant"
    )
    
    message = MIMEText(reply_body)
    message['to'] = sender_email
    message['subject'] = "Re: Roof Inspection Request"
    
    raw = base64.urlsafe_b64encode(message.as_bytes()).decode()
    body = {'message': {'raw': raw}}
    
    try:
        draft = service.users().drafts().create(userId="me", body=body).execute()
        print(f"   [ACTION] Draft Reply Created (ID: {draft['id']})")
    except Exception as e:
        print(f"   [ERROR] Draft creation failed: {e}")




def create_appointment(service, summary, location, description, start_time_iso, duration_minutes=60):
    """Creates a calendar event."""
    start_dt = datetime.datetime.fromisoformat(start_time_iso)
    end_dt = start_dt + datetime.timedelta(minutes=duration_minutes)
    
    event = {
        'summary': summary,
        'location': location,
        'description': description,
        'start': {
            'dateTime': start_dt.isoformat(),
            'timeZone': 'America/Chicago', # Updated for Dallas/Frisco area
        },
        'end': {
            'dateTime': end_dt.isoformat(),
            'timeZone': 'America/Chicago',
        },
        'reminders': {
            'useDefault': False,
            'overrides': [
                {'method': 'email', 'minutes': 24 * 60},
                {'method': 'popup', 'minutes': 30},
            ],
        },
    }

    try:
        event = service.events().insert(calendarId='primary', body=event).execute()
        print(f"[SUCCESS] Event created: {event.get('htmlLink')}")
        return event
    except HttpError as error:
        print(f"[ERROR] An error occurred: {error}")
        return None

def list_upcoming_events(service, max_results=10):
    now = datetime.datetime.utcnow().isoformat() + "Z"  # 'Z' indicates UTC time
    print(f"[INFO] Getting the upcoming {max_results} events")
    
    events_result = service.events().list(
        calendarId="primary",
        timeMin=now,
        maxResults=max_results,
        singleEvents=True,
        orderBy="startTime"
    ).execute()
    events = events_result.get("items", [])

    if not events:
        print("No upcoming events found.")
        return

    for event in events:
        start = event.get("start").get("dateTime", event.get("start").get("date"))
        print(f":: {start} | {event['summary']}")

if __name__ == "__main__":
    print("--- Google Agent (Calendar + Gmail) ---")
    cal_service, gmail_service = get_services()
    if cal_service:
        list_upcoming_events(cal_service)
    
    if gmail_service:
        check_inbox(gmail_service)
