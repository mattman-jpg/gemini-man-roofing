import os
import sys
import json
import logging
import datetime
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

# Ensure we can import from the scripts directory if run from root
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from openai import OpenAI
from scripts.calendar_agent import get_services, create_appointment

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ChatServer")

app = FastAPI(title="Gemini Man AI Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

SYSTEM_PROMPT = """You are 'Gemini Man', a highly intelligent, professional, and slightly futuristic roofing consultant AI for Gemini Man Roofing.
Your primary goal is to help users with roofing questions and schedule free drone inspections.
Maintain a confident, concise, and helpful tone. Avoid being overly pushy, but always guide them towards booking an inspection if they have damage or need an estimate. Use HTML sparingly like <strong> and <br> to format your text beautifully.

If the user wants to book an inspection or an estimate, you MUST collect:
1. Their Full Name
2. Their Phone Number
3. Their Address (street, city, zip)
4. A preferred date and time (e.g., "Tomorrow at 2 PM", "Next Tuesday morning").

Once you have ALL this information, call the `book_inspection` function. Let the user know you are booking it.
If you don't have all the info, ask for what is missing.

If they are referring a neighbor, tell them to visit the Referral page on the site.

Business details:
- Cost: $4.50 to $6.50 per sq ft for 30-year architectural shingles.
- Timeframe: 1-2 days for residential replacements.
- Phone: (866) 518-2906
- We offer free drone inspections.
- We help with insurance claims, ensuring the adjuster sees exactly the hail/wind damage we see.
- Service area: Dallas, Fort Worth, Plano, Frisco, McKinney, Richardson, Garland, Irving, Grapevine, Southlake, Lewisville.
"""

tools = [
    {
        "type": "function",
        "function": {
            "name": "book_inspection",
            "description": "Books a roof inspection in the Google Calendar. Call this ONLY when you have the user's name, phone, address, and a requested date/time.",
            "parameters": {
                "type": "object",
                "properties": {
                    "name": {
                        "type": "string",
                        "description": "Full name of the property owner"
                    },
                    "phone": {
                        "type": "string",
                        "description": "Phone number"
                    },
                    "address": {
                        "type": "string",
                        "description": "Property address"
                    },
                    "requested_time": {
                        "type": "string",
                        "description": "The date and time requested, formatted as ISO 8601 (e.g., 2026-02-21T14:00:00). If they say 'tomorrow at 2pm', figure out the date and convert it."
                    },
                    "notes": {
                        "type": "string",
                        "description": "Any additional notes or context (e.g., 'suspects hail damage', 'leaking roof')"
                    }
                },
                "required": ["name", "phone", "address", "requested_time"]
            }
        }
    }
]

def handle_book_inspection(arguments):
    try:
        args = json.loads(arguments)
        name = args.get("name")
        phone = args.get("phone")
        address = args.get("address")
        req_time = args.get("requested_time")
        notes = args.get("notes", "")

        cal_service, _ = get_services()
        if not cal_service:
            return "Error: Could not connect to the Calendar service."

        # Create event
        summary = f"Inspection: {name}"
        location = address
        description = f"Phone: {phone}\nNotes: {notes}\nBooked via Gemini Man AI Chatbot."
        
        event = create_appointment(
            cal_service, 
            summary=summary, 
            location=location, 
            description=description, 
            start_time_iso=req_time
        )
        
        if event:
            return f"✅ Success! I have scheduled the inspection at {address} for {req_time}. The team will call {phone} to confirm."
        else:
            return "Failed to create the calendar event. Please try calling us."
    except Exception as e:
        logger.error(f"Booking error: {e}")
        return f"Error booking inspection: {str(e)}"

class ChatRequest(BaseModel):
    message: str
    history: list = []

@app.post("/api/chat")
async def chat_endpoint(request: ChatRequest):
    if not request.message:
        raise HTTPException(status_code=400, detail="Message is required")

    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    
    # Inject current date into prompt for time math
    now_iso = datetime.datetime.now().isoformat()
    messages.append({"role": "system", "content": f"The current system date and time is {now_iso}. Use this to calculate 'tomorrow', 'next week', etc."})

    for msg in request.history:
        messages.append({"role": msg["role"], "content": msg["content"]})
        
    messages.append({"role": "user", "content": request.message})

    try:
        response = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            tools=tools,
            temperature=0.7
        )
        
        response_message = response.choices[0].message
        
        if response_message.tool_calls:
            # The AI wants to call a function
            for tool_call in response_message.tool_calls:
                function_name = tool_call.function.name
                arguments = tool_call.function.arguments
                
                logger.info(f"AI requested tool: {function_name} with args {arguments}")
                if function_name == "book_inspection":
                    function_response = handle_book_inspection(arguments)
                    
                    # We need to send the function response back to the AI so it can reply to the user
                    messages.append(response_message) # Append assistant's tool call request
                    messages.append({
                        "tool_call_id": tool_call.id,
                        "role": "tool",
                        "name": function_name,
                        "content": function_response,
                    })
                    
                    # Get final response from AI
                    final_response = openai_client.chat.completions.create(
                        model="gpt-4o-mini",
                        messages=messages,
                    )
                    return {"response": final_response.choices[0].message.content}

        content = response_message.content if response_message.content else "Processing request..."
        return {"response": content}
    except Exception as e:
        logger.error(f"AI Error: {e}")
        return {"error": "The neural network is currently unavailable. Please try again later."}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8081)
