import re
import subprocess
import os
import sys

def main():
    list_file_path = 'image_gen/images_to_generate.txt'
    output_dir = 'public/images'
    run_script = './image_gen/run_gen.sh'

    # Ensure output directory exists
    os.makedirs(output_dir, exist_ok=True)

    with open(list_file_path, 'r') as f:
        content = f.read()

    # Extract Style Suffix
    style_match = re.search(r'Style suffix \(append to every prompt\):\s*\n"([^"]+)"', content, re.DOTALL)
    if not style_match:
        print("Error: Could not find style suffix.")
        return
    style_suffix = style_match.group(1).strip().replace('\n', ' ')

    # Regex to find image entries
    # Format: 1. filename.png (dimensions) \n Description... [style suffix]
    # We look for lines starting with a number, dot, and space
    entries = re.split(r'\n\d+\. ', content)
    
    # Skip the header part (index 0)
    for i in range(1, len(entries)):
        entry = entries[i]
        
        # Extract filename
        # The filename is at the start, followed by dimensions in parens
        filename_match = re.match(r'([a-zA-Z0-9_-]+\.png)', entry)
        if not filename_match:
            print(f"Skipping entry {i}: Could not parse filename.")
            continue
        
        filename = filename_match.group(1)
        
        # Extract prompt
        # The prompt is everything after the first line (filename/dims) and before the next section
        # We need to clean it up
        lines = entry.split('\n')
        prompt_lines = []
        for line in lines[1:]: # Skip the first line which has filename
            line = line.strip()
            if not line: continue
            if line.startswith('=='): break # Stop if we hit a section header
            prompt_lines.append(line)
            
        prompt_text = " ".join(prompt_lines)
        
        # Replace [style suffix] with the actual text
        full_prompt = prompt_text.replace('[style suffix]', style_suffix)
        
        # Clean up any double spaces
        full_prompt = re.sub(r'\s+', ' ', full_prompt).strip()
        
        output_path = os.path.join(output_dir, filename)
        
        print(f"[{i}/{len(entries)-1}] Generating {filename}...")
        
        # Execute the generation script
        cmd = [run_script, output_path, full_prompt]
        try:
            subprocess.run(cmd, check=True)
        except subprocess.CalledProcessError as e:
            print(f"Failed to generate {filename}: {e}")

if __name__ == "__main__":
    main()
