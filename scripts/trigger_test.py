import requests
import json

# Local Flask Server URL
url = "http://127.0.0.1:5000/simulate-lead"

# Test Payload
payload = {
    "city": "Denver",
    "address": "123 Test St, Denver, CO 80202",
    "service": "Roof Inspection",
    "notes": "Hail damage suspected. Urgent."
}

try:
    print(f"Sending Test Lead to {url}...")
    response = requests.post(url, json=payload)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Failed to reach server: {e}")
    print("Is dispatch_server.py running?")
