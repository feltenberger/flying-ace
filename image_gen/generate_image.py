import argparse
import os
import sys
from google import genai
from google.genai import types
from PIL import Image
import io

# Get API KEY from environment
API_KEY = os.environ.get("GOOGLE_GENAI_API_KEY")

def main():
    parser = argparse.ArgumentParser(description="Generate an image using Google Gen AI.")
    parser.add_argument("output", help="Output filename (e.g., image.png)")
    parser.add_argument("prompt", help="Prompt for the image")
    parser.add_argument("--model", default="nano-banana-pro-preview", help="Model name (default: nano-banana-pro-preview)")

    args = parser.parse_args()

    if not API_KEY:
        print("Error: GOOGLE_GENAI_API_KEY environment variable is not set.")
        sys.exit(1)

    # Initialize the client with the API key
    client = genai.Client(api_key=API_KEY)

    print(f"Generating image with prompt: '{args.prompt}' using model '{args.model}'...")

    # Strategy 1: Try generate_images (Imagen style)
    try:
        response = client.models.generate_images(
            model=args.model,
            prompt=args.prompt,
            config=types.GenerateImagesConfig(
                number_of_images=1,
            )
        )
        
        if response.generated_images:
            image = response.generated_images[0].image
            image.save(args.output)
            print(f"Success (generate_images)! Saved to {args.output}")
            return
    except Exception as e_imagen:
        print(f"Standard image generation failed: {e_imagen}")
        print("Attempting generate_content (multimodal style)...")

    # Strategy 2: Try generate_content (Gemini style)
    try:
        response = client.models.generate_content(
            model=args.model,
            contents=args.prompt,
        )
        
        # Check for inline images in candidates
        if response.candidates and response.candidates[0].content and response.candidates[0].content.parts:
            for part in response.candidates[0].content.parts:
                if part.inline_data:
                    # Found an image!
                    print("Found inline image data.")
                    image_bytes = part.inline_data.data
                    image = Image.open(io.BytesIO(image_bytes))
                    image.save(args.output)
                    print(f"Success (generate_content)! Saved to {args.output}")
                    return
        
        print("No image data found in generate_content response.")
        # Debug: print text content if any
        if response.text:
             print(f"Model returned text instead: {response.text}")

    except Exception as e_content:
        print(f"Multimodal generation failed: {e_content}")

if __name__ == "__main__":
    main()