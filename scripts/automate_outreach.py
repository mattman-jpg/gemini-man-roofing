
import os
import time
import logging
import argparse
import pandas as pd # Replaces csv module
from dotenv import load_dotenv
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail

# Load environment variables
load_dotenv()

# Configure Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger("OutreachBot")

SENDGRID_API_KEY = os.environ.get('SENDGRID_API_KEY')
FROM_EMAIL = 'help@geminimanroofing.com'

if not SENDGRID_API_KEY:
    logger.error("SENDGRID_API_KEY not found. Please set it in your .env file.")
    exit(1)

# Templates from B2B Outreach Kit
# Gemini Configuration
GEMINI_KEY = os.environ.get('GEMINI_API_KEY')
import google.generativeai as genai

if GEMINI_KEY:
    genai.configure(api_key=GEMINI_KEY)
    model = genai.GenerativeModel('gemini-pro')
else:
    model = None
    logger.warning("GEMINI_API_KEY missing. Falling back to static templates.")

def generate_email_content(lead, step):
    """
    Uses Gemini to write a UNIQUE email for this specific lead.
    """
    if not model:
        return TEMPLATES.get(step) # Fallback

    # Prompt Engineering
    inspection_url = "https://geminimanroofing.com/#contact"
    
    prompt = f"""
    You are an expert B2B sales copywriter for Gemini Man Roofing.
    Write a short, professional, and personalized email to a property manager.
    
    Lead Info:
    - Name: {lead['name']}
    - Address: {lead['address']}
    - City: {lead['city']}
    
    Context (Step: {step}):
    - If "day1": Mention you drove by and saw drainage issues. Offer a free drone inspection.
    - If "day3": Case study (saving $150k).
    - If "day7": "Break up" email.
    
    MANDATORY REQUIREMENT:
    - You MUST include a Call to Action (CTA) linking to the Inspection Form.
    - URL: {inspection_url}
    - Link Text suggestion: "Book Free Drone Inspection" or "Schedule Assessment".
    
    Constraints:
    - Keep it under 75 words.
    - Be conversational.
    - Use HTML for line breaks (<br>) and links (<a href="...">...</a>).
    - Return ONLY a JSON object with keys: "subject" and "content".
    """
    
    try:
        response = model.generate_content(prompt)
        # Simple parsing (robustness would use a JSON parser library)
        import json
        clean_text = response.text.strip().replace("```json", "").replace("```", "")
        return json.loads(clean_text)
    except Exception as e:
        logger.error(f"Gemini Generation Error: {e}")
        return TEMPLATES.get(step) # Fallback

# Fallback Templates
TEMPLATES = {
    "day1": {
        "subject": "Roof condition at {address}",
        "content": "Hi {name},<br><br>Pass by {address} and saw some drainage concerns. Open to a free drone report?<br><br>Best,<br>Gemini Man"
    },
    "day3": {"subject": "Saving CapEx", "content": "Hi {name}, silicone coatings can save 40%. Interested?"},
    "day7": {"subject": "Permission to close file?", "content": "Hi {name}, assume this isn't a priority. Call (866) 518-2906 if needed."}
}

def normalize_lead(row):
    """
    Maps varied column names to the standard keys: name, email, address, city.
    """
    # Normalize keys to lowercase for easier matching
    row = {k.lower(): v for k, v in row.items()}
    
    # Name Logic
    if 'firstname' in row and pd.notna(row['firstname']):
        name = str(row['firstname']).strip()
    elif 'name' in row:
        name = str(row['name']).strip().split()[0] # First word
    else:
        name = "Property Manager"

    # Email Logic
    email = None
    if 'emailaddress' in row and pd.notna(row['emailaddress']):
        email = str(row['emailaddress']).strip()
    elif 'email' in row and pd.notna(row['email']):
        email = str(row['email']).strip()
    
    # Address Logic
    address = "your property"
    if 'address' in row and pd.notna(row['address']):
        address = str(row['address']).strip()
    
    # City Logic
    city = "Dallas"
    if 'city' in row and pd.notna(row['city']):
        city = str(row['city']).strip()

    return {
        'name': name,
        'email': email,
        'address': address,
        'city': city
    }

def send_email(lead, step, dry_run=False):
    # Template/Generation Logic handles inside generate_email_content
    # template = TEMPLATES.get(step) -> Moved logic down

    if not lead['email'] or '@' not in lead['email']:
        logger.warning(f"Skipping invalid email: {lead['email']} for {lead['name']}")
        return False

    try:
        # Generate dynamic content using Gemini
        email_data = generate_email_content(lead, step)
        
        # Personalize content (Fallbacks still rely on format)
        subject = email_data["subject"].format(**lead) if "{" in email_data["subject"] else email_data["subject"]
        content = email_data["content"].format(**lead) if "{" in email_data["content"] else email_data["content"]

        if dry_run:
            print("\n" + "="*40)
            print(f"👀 DRY RUN [To: {lead['email']}]")
            print(f"Subject: {subject}")
            print(f"Body:\n{content}")
            print("="*40 + "\n")
            return True

        message = Mail(
            from_email=FROM_EMAIL,
            to_emails=lead['email'],
            subject=subject,
            html_content=content
        )

        sg = SendGridAPIClient(SENDGRID_API_KEY)
        response = sg.send(message)
        logger.info(f"[{step.upper()}] Sent to {lead['email']} (Status: {response.status_code})")
        return True

    except Exception as e:
        logger.error(f"Failed to send to {lead['email']}: {e}")
        return False

def main():
    parser = argparse.ArgumentParser(description="Automate B2B Outreach")
    parser.add_argument("--file", default="leads.csv", help="Path to input file (csv or xlsx)")
    parser.add_argument("--dry-run", action="store_true", help="Generate emails but do not send them")
    args = parser.parse_args()

    if not os.path.exists(args.file):
        logger.error(f"File not found: {args.file}")
        print(f"Please specify a valid file path using --file")
        exit(1)

    print(f"Starting Outreach Sequence: {args.step.upper()}")
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

    count = 0
    # Iterate through DataFrame
    for index, row in df.iterrows():
        lead_data = normalize_lead(row)
        if send_email(lead_data, args.step, dry_run=args.dry_run):
            count += 1
        time.sleep(1) # Rate limit protection

    print("-" * 40)
    print(f"Completed. Sent {count} emails.")

if __name__ == "__main__":
    main()
