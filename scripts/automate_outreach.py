
import os
import time
import json
import logging
import argparse
import random
import pandas as pd
from datetime import datetime
from dotenv import load_dotenv
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail
import google.generativeai as genai

# Load environment variables
load_dotenv()

# Configure Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger("OutreachBot")

# --- INBOX ROTATOR CONFIGURATION ---
# Define your sending accounts here.
# In production, this could be loaded from a secure accounts.json file.
# --- INBOX ROTATOR CONFIGURATION ---
def load_accounts():
    try:
        with open('accounts.json', 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        # Fallback default
        return [{
            "id": "default", 
            "email": "help@geminimanroofing.com", 
            "name": "Gemini Man", 
            "api_key_env": "SENDGRID_API_KEY"
        }]

ACCOUNTS = load_accounts()

def get_sending_account():
    """Selects an account to send from based on rotation logic."""
    if not ACCOUNTS:
        logger.error("No accounts found in accounts.json")
        return None, None
    
    # Simple Random Rotation (Distributes load evenly)
    account = random.choice(ACCOUNTS)
    api_key = os.environ.get(account.get('api_key_env', 'SENDGRID_API_KEY'))
    return account, api_key

# --- AI Configuration ---
GEMINI_KEY = os.getenv("GEMINI_API_KEY")
OPENAI_KEY = os.getenv("OPENAI_API_KEY")

ai_client = None
ai_provider = None

if OPENAI_KEY:
    try:
        from openai import OpenAI
        ai_client = OpenAI(api_key=OPENAI_KEY)
        ai_provider = "openai"
        logger.info("[AI] Power by OpenAI (GPT-4o)")
    except Exception as e:
        logger.error(f"OpenAI Init Failed: {e}")

if not ai_client and GEMINI_KEY:
    try:
        import google.generativeai as genai
        genai.configure(api_key=GEMINI_KEY)
        ai_client = genai.GenerativeModel('gemini-1.5-flash')
        ai_provider = "gemini"
        logger.info("[AI] Powered by Google Gemini")
    except Exception as e:
        logger.error(f"Gemini Init Failed: {e}")

if not ai_client:
    logger.warning("[WARN] No AI Available. Falling back to static templates.")

# Fallback Templates
TEMPLATES = {
    "day1": {
        "subject": "Roof condition at {address}",
        "content": "Hi {name},<br><br>Pass by {address} and saw some drainage concerns. Open to a free drone report?<br><br>Best,<br>Gemini Man"
    },
    "day3": {"subject": "Saving CapEx", "content": "Hi {name}, silicone coatings can save 40%. Interested?"},
    "day7": {"subject": "Permission to close file?", "content": "Hi {name}, assume this isn't a priority. Call (866) 518-2906 if needed."}
}

def generate_email_content(lead, step):
    """
    Uses AI (OpenAI > Gemini) to write a UNIQUE email.
    """
    # Load HTML Template
    template_path = os.path.join("templates", "email_template_v3.html")
    if os.path.exists(template_path):
        with open(template_path, "r", encoding="utf-8") as f:
            html_template = f.read()
        print(f"[DEBUG] HTML Template Loaded: Yes ({len(html_template)} chars)")
    else:
        logger.warning(f"HTML template not found at {template_path}! Using basic HTML fallback.")
        html_template = "<html><body><p>{content}</p><p><a href='{inspection_url}'>Check My Roof</a></p></body></html>"
        print("[DEBUG] HTML Template Loaded: No (Using Fallback)")
    if not ai_client:
        return TEMPLATES.get(step) # Fallback

    # Prompt Engineering (Avant-Garde / High-Conversion)
    inspection_url = "https://geminimanroofing.com/book-inspection?source=ai_outreach"
    referral_url = "https://geminimanroofing.com/refer.html"
    
    prompt = f"""
    You are the "Gemini Man" - a futuristic, high-tech roofing consultant for exclusive properties.
    Write a sophisticated, avant-garde email to a property owner.
    
    Lead Info:
    - Name: {lead['name']}
    - Address: {lead['address']}
    - City: {lead['city']}
    
    Context (Step: {step}):
    - If "day1": "Anomaly Detected". You scanned the {lead['city']} grid and identified specific hail impact signatures near their coordinates. It's not just a roof; it's an asset requiring calibration.
    - If "day3": "Data Correlation". The weather data overlaps with their asset value. Suggest a "Forensic Drone Calibration" (Inspection).
    - If "day7": "Final Transmission". Closing the loop on this grid sector.
    
    MANDATORY REQUIREMENTS:
    1. Tone: Minimalist, Intelligent, Slightly Futuristic, but Professional. "Avant-Garde".
    2. CALL TO ACTION: Use this link for the "Forensic Inspection": {inspection_url}
    3. REFERRAL: "Have a neighbor in this grid? Send them this link for a $250 Protocol Reward: {referral_url}"
    
    Constraints:
    - Keep it under 90 words.
    - Use line breaks for readability.
    - Do not sound like a spammy salesman. Sound like a high-end consultant.
    """

    try:
        content = ""
        if ai_provider == "openai":
            response = ai_client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": "You are Gemini Man: A high-tech, avant-garde automated home consultant."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.8,
                max_tokens=250
            )
            content = response.choices[0].message.content.strip()
            
        elif ai_provider == "gemini":
            response = ai_client.generate_content(prompt)
            content = response.text.strip()
            
        # Basic cleanup
        content = content.replace("```html", "").replace("```", "")
        
        # Remove "Subject:" if AI included it
        if "Subject:" in content:
            parts = content.split("\n\n", 1)
            if len(parts) > 1:
                content = parts[1] # Keep only body
            else:
                content = content.replace("Subject:", "").strip()

        # Inject intro using .replace() to avoid CSS bracket conflicts
        final_html = html_template.replace("{content}", content).replace("{inspection_url}", inspection_url)
        
        return {
            "subject": f"Grid Alert: {lead['address']} [Urgent Data]",
            "content": final_html
        }
            
    except Exception as e:
        logger.error(f"AI Gen Error: {e}")
        # FALLBACK: Use a generic safe message but WRAPPED in the HTML template
        fallback_text = TEMPLATES.get(step) 
        # Convert newlines to breaks for HTML
        fallback_html = fallback_text.replace("\n", "<br>")
        
        final_html = html_template.replace("{content}", fallback_html).replace("{inspection_url}", inspection_url)
        return {
            "subject": f"Update regarding {lead['address']}",
            "content": final_html
        }

def normalize_lead(row):
    """
    Maps varied column names to the standard keys: name, email, address, city.
    """
    # Normalize keys to lowercase by converting the row items
    # Iterate safely to avoid attribute errors if row isn't standard dict-like (though pandas Series is fine)
    row_dict = {str(k).lower(): v for k, v in row.items()}
    
    # ... (Rest of logic same, just using row_dict) ...
    # Name Logic
    if 'firstname' in row_dict and pd.notna(row_dict['firstname']):
        name = str(row_dict['firstname']).strip()
    elif 'name' in row_dict:
        name = str(row_dict['name']).strip().split()[0] # First word
    else:
        name = "Property Manager"

    # Email Logic
    email = None
    if 'emailaddress' in row_dict and pd.notna(row_dict['emailaddress']):
        email = str(row_dict['emailaddress']).strip()
    elif 'email' in row_dict and pd.notna(row_dict['email']):
        email = str(row_dict['email']).strip()
    
    # Address Logic
    address = "your property"
    if 'address' in row_dict and pd.notna(row_dict['address']):
        address = str(row_dict['address']).strip()
    
    # City Logic
    city = "Dallas"
    if 'city' in row_dict and pd.notna(row_dict['city']):
        city = str(row_dict['city']).strip()

    return {
        'name': name,
        'email': email,
        'address': address,
        'city': city
    }

def send_email(lead, step, dry_run=False):
    # Select Sending Account
    account, api_key = get_sending_account()
    
    if not account:
        return False

    if not lead['email'] or '@' not in lead['email']:
        logger.warning(f"Skipping invalid email: {lead['email']}")
        return False

    try:
        # Generate dynamic content
        email_data = generate_email_content(lead, step)
        
        if not email_data:
            logger.error(f"No email data generated for step: {step}")
            return False

        # Personalize content
        # Check if formatting is safe (no CSS braces)
        subject = email_data["subject"]
        content = email_data["content"]
        
        # Only format if it looks like a simple string without CSS
        if "{" in subject and "body" not in subject:
             try: subject = subject.format(**lead)
             except: pass
             
        if "{" in content and "<style>" not in content:
             try: content = content.format(**lead)
             except: pass

        if dry_run:
            print("\n" + "="*40)
            # Use ASCII arrow to prevent Windows encoding crash
            print(f"DRY RUN [From: {account['email']} -> To: {lead['email']}]")
            try:
                print(f"Subject: {subject}")
                print(f"Body:\n{content}")
            except UnicodeEncodeError:
                print(f"Subject: {subject.encode('ascii', 'ignore').decode()}")
            print("="*40 + "\n")
            return True

        if not api_key:
            logger.error(f"Missing API Key for account {account['id']}. Skipping.")
            return False

        message = Mail(
            from_email=account['email'],
            to_emails=lead['email'],
            subject=subject,
            html_content=content # Explicitly using html_content
        )
        
        # Debug: Check if content looks like HTML
        stripped_content = content.strip()
        print(f"[DEBUG] Content Preview: {content[:200]!r}")
        
        if stripped_content.startswith("<!DOCTYPE html") or stripped_content.startswith("<html"):
            print("[DEBUG] Sending HTML Content")
        else:
            print("[WARNING] Sending Plain Text Content (Template Failed)")

        sg = SendGridAPIClient(api_key)
        response = sg.send(message)
        logger.info(f"[{step.upper()}] Sent from {account['email']} to {lead['email']} (Status: {response.status_code})")
        return True

    except Exception as e:
        logger.error(f"Failed to send to {lead['email']}: {e}")
        return False

def main():
    parser = argparse.ArgumentParser(description="Automate B2B Outreach")
    parser.add_argument("step", help="Campaign step (day1, day3, day7)")
    parser.add_argument("--file", default="homeowner_leads.csv", help="Path to input file (csv or xlsx)")
    parser.add_argument("--dry-run", action="store_true", help="Generate emails but do not send them")
    parser.add_argument("--limit", type=int, default=50, help="Max emails to send per run (Warm-up protection)")
    parser.add_argument("--start-index", type=int, default=0, help="Start processing from this row index (0-based)")
    args = parser.parse_args()

    if not os.path.exists(args.file):
        logger.error(f"File not found: {args.file}")
        print(f"Please specify a valid file path using --file")
        exit(1)

    print(f"Starting Outreach Sequence: {args.step.upper()}")
    print(f"Mode: {'DRY RUN (Simulation)' if args.dry_run else 'LIVE SENDING'}")
    print(f"Resuming from Row: {args.start_index}")
    print("-" * 40)

    # Read File based on extension
    try:
        if args.file.endswith('.xlsx'):
            df = pd.read_excel(args.file)
        else:
            df = pd.read_csv(args.file)
    except Exception as e:
        logger.error(f"Error reading file: {e}")
        exit(1)

    # Load History
    history_file = "outreach_history.csv"
    sent_emails = set()
    if os.path.exists(history_file):
        try:
            history_df = pd.read_csv(history_file)
            # Filter for current step to allow multi-step campaigns (day1, day3, etc.)
            if 'step' in history_df.columns:
                step_history = history_df[history_df['step'] == args.step.lower()]
                sent_emails = set(step_history['email'].str.lower().tolist())
            else:
                # Legacy support if file exists but no 'step' column (unlikely given creation logic)
                sent_emails = set(history_df['email'].str.lower().tolist())
                
            print(f"[INFO] Loaded {len(sent_emails)} previously sent emails.")
        except Exception as e:
            logger.error(f"Error loading history: {e}")

    count = 0
    # Iterate through DataFrame
    for index, row in df.iterrows():
        # Skip rows before start_index
        if index < args.start_index:
            continue
            
        if count >= args.limit:
            print(f"\n[STOP] Reached batch limit of {args.limit} emails. (Warm-up Mode)")
            break

        lead_data = normalize_lead(row)
        email_key = str(lead_data['email']).strip().lower()
        
        # SKIP if already sent
        if email_key in sent_emails:
            continue

        if send_email(lead_data, args.step, dry_run=args.dry_run):
            # Log successful send
            if not args.dry_run:
                with open(history_file, 'a', newline='') as f:
                    # Write header if file is new
                    if f.tell() == 0:
                        f.write("date,email,step,status\n")
                    f.write(f"{datetime.now().isoformat()},{email_key},{args.step},sent\n")
            
            count += 1
            # Add random jitter but faster if flooding is requested (keep safe for now)
            time.sleep(random.uniform(2, 5)) 

    print("-" * 40)
    print(f"Completed. {count} emails processed.")

if __name__ == "__main__":
    main()
