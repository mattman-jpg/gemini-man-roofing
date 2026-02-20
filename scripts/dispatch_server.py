import os
import json
import logging
import threading
import time
from datetime import datetime
from flask import Flask, request, jsonify
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger("DispatchAgent")

app = Flask(__name__)

# --- IN-MEMORY DATABASE (Replace with database in prod) ---
# Stores active jobs and their status
ACTIVE_JOBS = {} 
# Mapping of Contractor Phone -> Active Job ID they were texted about
CONTRACTOR_CONTEXT = {} 

class ContractorDispatcher:
    def __init__(self):
        self.contractors = self.load_contractors()

    def load_contractors(self):
        try:
            with open('contractors.json', 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            return []

    def get_best_contractors(self, zip_code):
        """Finds active contractors in zip, sorted by rating."""
        matches = [c for c in self.contractors if zip_code in c.get('zip_codes', []) and c.get('status') == 'active']
        matches.sort(key=lambda x: x.get('rating', 0), reverse=True)
        return matches

    def blast_lead(self, job_id, lead):
        """Sends SMS to all eligible contractors."""
        contractors = self.get_best_contractors("75024") # Simulating match
        
        if not contractors:
            logger.warning("No contractors found!")
            return False

        # Save Job State
        ACTIVE_JOBS[job_id] = {
            "lead": lead,
            "status": "OPEN",
            "notified_contractors": []
        }

    # Real SMS Blast
        try:
            from twilio.rest import Client
            account_sid = os.getenv('TWILIO_ACCOUNT_SID')
            auth_token = os.getenv('TWILIO_AUTH_TOKEN')
            from_number = os.getenv('TWILIO_PHONE_NUMBER', '+15550109988') # Fallback if env missing
            client = Client(account_sid, auth_token)
        except Exception as e:
            logger.error(f"Twilio Error: {e}")
            return False
        
        msg_body = f"URGENT LEAD: {lead['city']}. Roof Inspection. Est Profit $4k. Reply YES to claim. First come first serve."
        
        for contractor in contractors:
            try:
                logger.info(f"Sending SMS to {contractor['name']} ({contractor['phone']})...")
                message = client.messages.create(
                    body=msg_body,
                    from_=from_number,
                    to=contractor['phone']
                )
                # Map this contractor's phone to this job for reply context
                CONTRACTOR_CONTEXT[contractor['phone']] = job_id
                ACTIVE_JOBS[job_id]['notified_contractors'].append(contractor['id'])
            except Exception as e:
                logger.error(f"Failed to text {contractor['name']}: {e}")
                
        logger.info("Blast complete. Waiting for replies...")
        return True

    def assign_job(self, job_id, contractor_phone):
        """Locks the job and triggers the handover."""
        job = ACTIVE_JOBS.get(job_id)
        
        if not job:
            return "Job not found or expired."
            
        if job['status'] == "ASSIGNED":
            return "TOO LATE! Job was just taken by another crew."

        # Find contractor profile
        contractor = next((c for c in self.contractors if c['phone'] == contractor_phone), None)
        if not contractor:
            return "Error: Contractor not found."

        # --- THE LOCK ---
        job['status'] = "ASSIGNED"
        job['assigned_to'] = contractor['name']
        job['assigned_at'] = datetime.now().isoformat()
        
        logger.info(f"✅ JOB {job_id} ASSIGNED TO {contractor['name']}!")
        
        # TRIGGER PAYMENT & PAPERWORK
        self.send_onboarding_docs(contractor, job['lead'])
        
        return "CONFIRMED! You won the job. Check email for the Lead Sheet & Invoice Agreement."

    def send_onboarding_docs(self, contractor, lead):
        """Emails the PDF paperwork + Payment Link to the winner."""
        
        # Create Dynamic Stripe Checkout Session
        try:
            import stripe
            stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
            
            # Load Price ID from config if available, otherwise fallback or dynamic
            price_id = "price_1Q..." # Placeholder if config fetch fails
            try:
                with open("stripe_config.json", "r") as f:
                    config = json.load(f)
                    price_id = config.get("LEAD_DEPOSIT_PRICE_ID")
            except:
                logger.warning("Could not load stripe_config.json, ensure Setup script ran.")

            session = stripe.checkout.Session.create(
                payment_method_types=['card'],
                line_items=[{
                    'price': price_id,
                    'quantity': 1,
                }],
                mode='payment',
                success_url='https://geminimanroofing.com/success?session_id={CHECKOUT_SESSION_ID}',
                cancel_url='https://geminimanroofing.com/cancel',
                metadata={
                    "job_id": lead.get('address', 'unknown'), # ideally pass job_id here
                    "contractor_email": contractor['email']
                }
            )
            payment_link = session.url
        except Exception as e:
            logger.error(f"Stripe Error: {e}")
            payment_link = "https://geminimanroofing.com/pay-manual" # Fallback

        email_body = f"""
        <strong>CONGRATS {contractor['name']}!</strong><br><br>
        
        You have secured the lead at: <strong>{lead['address']}</strong>.<br><br>
        
        <strong>NEXT STEPS:</strong><br>
        1. <strong>REVIEW:</strong> See attached Lead Handoff Sheet.<br>
        2. <strong>CONTACT:</strong> Call the homeowner immediately.<br>
        3. <strong>AGREE:</strong> By accepting this lead, you agree to the 50% Profit Share.<br>
        4. <strong>PAY:</strong> Please permit the hold for materials/split here: <a href="{payment_link}">{payment_link}</a><br><br>
        
        Go verify the roof and close the deal!<br>
        - Gemini Man Dispatch
        """
        
        logger.info(f"📧 SENDING EMAIL TO {contractor['email']}...")
        
        # Real Email Send via SendGrid
        try:
            import sendgrid
            from sendgrid.helpers.mail import Mail, Email, To, Content
            
            sg_key = os.getenv('SENDGRID_API_KEY')
            if not sg_key:
                logger.error("❌ SENDGRID_API_KEY missing in .env! Email not sent.")
                return

            sg = sendgrid.SendGridAPIClient(api_key=sg_key)
            from_email = Email("matthew@geminimanroofing.com", "Gemini Man Dispatch") # Update with verified sender
            to_email = To(contractor['email'])
            subject = f"🚀 JOB WON: {lead['address']} - {lead['city']}"
            content = Content("text/html", email_body)
            
            mail = Mail(from_email, to_email, subject, content)
            
            response = sg.client.mail.send.post(request_body=mail.get())
            logger.info(f"✅ Email Sent! Status Code: {response.status_code}")
            
        except Exception as e:
            logger.error(f"❌ Failed to send email: {e}")

# --- FLASK WEBHOOK FOR SMS REPLIES ---
dispatcher = ContractorDispatcher()

@app.route('/sms-webhook', methods=['POST'])
def sms_reply():
    """
    Twilio hits this endpoint when a contractor replies.
    """
    sender_phone = request.form.get('From') or "+15550109988" # Default for testing
    info = request.form.get('Body', '').strip().upper()
    
    logger.info(f"📩 INCOMING SMS FROM {sender_phone}: {info}")
    
    # 1. Identify Context
    job_id = CONTRACTOR_CONTEXT.get(sender_phone)
    if not job_id:
        return "No active job offers found for you."
    
    # 2. Process "YES"
    if "YES" in info:
        response_text = dispatcher.assign_job(job_id, sender_phone)
    else:
        response_text = "Reply YES to claim the job."

    # In Prod: Return TwiML
    return str(response_text)

# --- SIMULATION ENDPOINT ---
@app.route('/simulate-lead', methods=['POST'])
def trigger_test():
    """To trigger the process manually"""
    lead = {
        "name": "Alice Homeowner",
        "address": "500 Elm St",
        "city": "Frisco",
        "scope": "Hail Damage"
    }
    job_id = f"JOB-{int(time.time())}"
    dispatcher.blast_lead(job_id, lead)
    return jsonify({"status": "Blasted", "job_id": job_id})

if __name__ == "__main__":
    # Add dummy emails to contractors.json if missing for the simulation
    
    # Auto-Start ngrok Tunnel
    try:
        from pyngrok import ngrok
        
        # Set Auth Token if available
        ngrok_token = os.getenv('NGROK_AUTHTOKEN')
        if ngrok_token:
            ngrok.set_auth_token(ngrok_token)
            
        # Open a HTTP tunnel on the default port 5000
        public_url = ngrok.connect(5000).public_url
        print(f" * \n\nPUBLIC NGROK URL: {public_url}\n   (Paste this into Twilio Webhook URL field)\n")
    except ImportError:
        print(" * ngrok not installed, running locally only.")
    except Exception as e:
        print(f" * ngrok error: {e}")

    print("Dispatch Server Running on Port 5000...")
    app.run(port=5000)
