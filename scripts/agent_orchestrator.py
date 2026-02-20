import os
import logging
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import google.generativeai as genai

# Load API Keys
load_dotenv()

# Configure Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger("GeminiEngine")

app = Flask(__name__)
CORS(app)  # Allow frontend widget to connect

# Initialize Gemini
GEMINI_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_KEY:
    genai.configure(api_key=GEMINI_KEY)
    model = genai.GenerativeModel('gemini-pro') # Or 'gemini-ultra' if available
else:
    logger.warning("GEMINI_API_KEY is missing. Chatbot will be in offline mode.")
    model = None

# System Prompt for "Gemini Man"
SYSTEM_PROMPT = """
You are the "Gemini Man", an expert roofing consultant for Gemini Man Roofing in North Texas.
Your goal is to be helpful, professional, and ultimately get the user to schedule a free inspection.

Key Information:
- Services: Residential Shingle, Metal Roofing, Commercial TPO/Coatings.
- Pricing: $4.50-$6.50/sqft for shingles (roughly). Always give ranges, never exact quotes.
- Hail: Recent large hail in Plano (May 4th). Use this to create urgency.
- Contact: (866) 518-2906.

Rules:
1. Keep answers short (under 3 sentences) for chat.
2. If they ask about price, give the range and ask for their address to be precise.
3. If they accept an inspection, ask for their Name and Phone Number.
"""

@app.route('/api/chat', methods=['POST'])
def chat():
    data = request.json
    user_msg = data.get('message', '')
    
    if not model:
        return jsonify({"response": "I'm currently offline (API Key missing). Please call (866) 518-2906."})

    try:
        # Construct the full prompt context
        full_prompt = f"{SYSTEM_PROMPT}\n\nUser: {user_msg}\nGemini Man:"
        
        response = model.generate_content(full_prompt)
        bot_reply = response.text
        
        # --- People API Hook (Lead Capture) ---
        # If the bot detects a name and phone number in the user's message, 
        # we can autosave it to Google Contacts here.
        # TODO: Implement `save_contact_to_people_api(name, phone)`
        
        return jsonify({"response": bot_reply})
    
    except Exception as e:
        logger.error(f"Gemini Error: {e}")
        return jsonify({"response": "I'm having trouble connecting to the hail tracking satellites. Please try again."})

@app.route('/api/status', methods=['GET'])
def status():
    return jsonify({
        "status": "online",
        "gemini_connected": bool(GEMINI_KEY),
        "maps_key_configured": bool(os.getenv("GOOGLE_MAPS_API_KEY")),
        "people_api_ready": "Configured in Phase 3"
    })

if __name__ == '__main__':
    print("🚀 Gemini Agent Engine Running on http://localhost:5000")
    app.run(port=5000, debug=True)
