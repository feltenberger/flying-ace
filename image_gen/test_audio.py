from google import genai
import os
import sys

API_KEY = os.environ.get("GOOGLE_GENAI_API_KEY")
if not API_KEY:
    print("Error: GOOGLE_GENAI_API_KEY not set")
    sys.exit(1)

client = genai.Client(api_key=API_KEY)

model_name = 'models/gemini-2.0-flash-exp'
prompt = "Generate a sound effect of a 1920s biplane engine starting up and sputtering."

print(f"Attempting to generate audio with {model_name}...")

try:
    response = client.models.generate_content(
        model=model_name,
        contents=prompt,
        # config removed to let model decide
    )
    
    found_audio = False
    if response.candidates and response.candidates[0].content and response.candidates[0].content.parts:
        for part in response.candidates[0].content.parts:
            if part.inline_data:
                print(f"Found inline data: MIME={part.inline_data.mime_type}")
                if part.inline_data.mime_type.startswith('audio/'):
                    found_audio = True
                    output_file = "test_audio.mp3"
                    with open(output_file, "wb") as f:
                        f.write(part.inline_data.data)
                    print(f"Success! Saved audio to {output_file}")
            elif part.text:
                print(f"Text response: {part.text}")

    if not found_audio:
        print("No audio data found in response.")

except Exception as e:
    print(f"Error: {e}")
