from google import genai
import os
import sys

API_KEY = os.environ.get("GOOGLE_GENAI_API_KEY")
if not API_KEY:
    print("Error: GOOGLE_GENAI_API_KEY not set")
    sys.exit(1)

client = genai.Client(api_key=API_KEY)

print("Listing models...")
for model in client.models.list():
    print(model.name)
