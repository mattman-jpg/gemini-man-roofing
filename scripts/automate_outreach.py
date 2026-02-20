
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
TEMPLATES = {
    "day1": {
        "subject": "Roof condition at {address} - quick question",
        "content": """
            Hi {name},<br><br>
            I drove by {address} yesterday and noticed some potential drainage issues on the flat roof that typical inspections usually miss.<br><br>
            I'm not looking to sell you a roof today. But we're doing some drone thermal mapping in {city} this week, and I'd love to drop off a <strong>Free Asset Condition Report</strong> for that property.<br><br>
            It includes a 10-year lifespan projection and core cut analysis to help with your CapEx planning.<br><br>
            Open to me stopping by for 10 mins on Thursday to drop it off?<br><br>
            Best,<br>
            [Your Name]<br>
            Gemini Man Roofing<br>
            *(866) 518-2906*
        """
    },
    "day3": {
        "subject": "Saving 40% on CapEx (Case Study)",
        "content": """
            {name},<br><br>
            Following up on my last note.<br><br>
            Most property managers we work with are shocked to find they can extend their current roof's life by 10-15 years with a simple silicone coating restoration, rather than a full tear-off.<br><br>
            We just saved a management firm in Plano over $150k using this method. (Tax deductible as maintenance, too).<br><br>
            Here's the <a href="https://your-site.com/commercial-roofing.html">Link to our Commercial Page</a> showing the systems we use.<br><br>
            Worth a quick chat to see if {address} qualifies?<br><br>
            [Your Name]
        """
    },
    "day7": {
        "subject": "Crossing this off?",
        "content": """
            Hi {name},<br><br>
            I assume improving the roof longevity at {address} isn't a priority right now, or you have a vendor you're thrilled with.<br><br>
            I'll stop reaching out. But if you ever need a second opinion or an emergency tarp after a storm, keep my number: *(866) 518-2906*.<br><br>
            We specialize in rapid response for commercial assets.<br><br>
            Cheers,<br>
            [Your Name]
        """
    }
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

def send_email(lead, step):
    template = TEMPLATES.get(step)
    if not template:
        logger.error(f"Invalid step: {step}")
        return False

    if not lead['email'] or '@' not in lead['email']:
        logger.warning(f"Skipping invalid email: {lead['email']} for {lead['name']}")
        return False

    try:
        # Personalize content
        subject = template["subject"].format(**lead)
        content = template["content"].format(**lead)

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
    parser.add_argument("step", choices=["day1", "day3", "day7"], help="Which sequence step to send")
    # Supports both .csv and .xlsx
    parser.add_argument("--file", default="leads.csv", help="Path to input file (csv or xlsx)")
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
        if send_email(lead_data, args.step):
            count += 1
        time.sleep(1) # Rate limit protection

    print("-" * 40)
    print(f"Completed. Sent {count} emails.")

if __name__ == "__main__":
    main()
