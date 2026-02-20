
import os
import logging
from dotenv import load_dotenv
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail

# Config
load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("StaticTest")

# Hardcoded Test Data
TEST_EMAIL = "mattgiron24@icloud.com"  # Change to target
TEST_EMAIL_2 = "gironmatt0@gmail.com"
TEMPLATE_PATH = "templates/email_template_v2.html"

def send_static_test(target_email):
    try:
        # Load Template
        with open(TEMPLATE_PATH, "r", encoding="utf-8") as f:
            html_template = f.read()
            
        # Hardcoded Content (Safe string, no curly braces)
        safe_content = """
        <p><strong>Hi Matt, (Static Test)</strong></p>
        <p>This is a hardware-level test of the new HTML template. We bypassed the AI to ensure the design renders correctly.</p>
        <p>If you see the orange button and the logo header, the template is fixed.</p>
        <p>Checking reporting on: 123 Test St.</p>
        """
        
        # Inject using .replace() which is safer for HTML/CSS than .format()
        final_html = html_template.replace("{content}", safe_content).replace("{inspection_url}", "https://geminimanroofing.com/#contact")
        
        # Send
        message = Mail(
            from_email='matt@geminimanroofing.com',
            to_emails=target_email,
            subject="⚡ STATIC TEMPLATE TEST (No AI)",
            html_content=final_html
        )
        
        sg = SendGridAPIClient(os.environ.get('SENDGRID_API_KEY'))
        response = sg.send(message)
        logger.info(f"Sent to {target_email}: Status {response.status_code}")
        return True
        
    except Exception as e:
        logger.error(f"CRITICAL ERROR: {e}")
        return False

if __name__ == "__main__":
    logger.info("Starting Static Template Test...")
    send_static_test(TEST_EMAIL)
    send_static_test(TEST_EMAIL_2)
