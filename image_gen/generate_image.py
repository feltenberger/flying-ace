import argparse
import os
import sys
from google import genai
from google.genai import types

# Get API KEY from environment
API_KEY = os.environ.get("GOOGLE_GENAI_API_KEY")

def main():
    parser = argparse.ArgumentParser(description="Generate an image using Google Gen AI (Imagen).")
    parser.add_argument("output", help="Output filename (e.g., image.png)")
    parser.add_argument("prompt", help="Prompt for the image")
    parser.add_argument("--model", default="imagen-4.0-generate-001", help="Model name (default: imagen-4.0-generate-001)")

    args = parser.parse_args()

    if not API_KEY:
        print("Error: GOOGLE_GENAI_API_KEY environment variable is not set. Set it by exporting GOOGLE_GENAI_API_KEY with the key (which you can access at https://aistudio.google.com/api-keys")
        sys.exit(1)

    # Initialize the client with the API key
    client = genai.Client(api_key=API_KEY)

    print(f"Generating image with prompt: '{args.prompt}'...")

    try:
        # Generate the image
        response = client.models.generate_images(
            model=args.model,
            prompt=args.prompt,
            config=types.GenerateImagesConfig(
                number_of_images=1,
            )
        )
        
        # Save the image
        if response.generated_images:
            # The new SDK returns PIL images directly in the response structure
            image = response.generated_images[0].image
            image.save(args.output)
            print(f"Success! Image saved to {args.output}")
        else:
            print("No images returned from the API.")

    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    main()
