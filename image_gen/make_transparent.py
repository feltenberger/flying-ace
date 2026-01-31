import argparse
from PIL import Image

def hex_to_rgb(hex_color):
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))

def make_transparent(input_path, output_path, hex_color, tolerance=0):
    try:
        img = Image.open(input_path)
        img = img.convert("RGBA")
        
        datas = img.getdata()
        
        target_rgb = hex_to_rgb(hex_color)
        
        newData = []
        for item in datas:
            # item is (R, G, B, A)
            
            # Check distance if tolerance is set, otherwise exact match
            if tolerance > 0:
                dist = sum(abs(item[i] - target_rgb[i]) for i in range(3))
                if dist <= tolerance:
                    newData.append((255, 255, 255, 0)) # Transparent
                else:
                    newData.append(item)
            else:
                if item[0] == target_rgb[0] and item[1] == target_rgb[1] and item[2] == target_rgb[2]:
                    newData.append((255, 255, 255, 0)) # Transparent
                else:
                    newData.append(item)
        
        img.putdata(newData)
        img.save(output_path, "PNG")
        print(f"Successfully saved transparent image to {output_path}")
        
    except Exception as e:
        print(f"Error: {e}")

def main():
    parser = argparse.ArgumentParser(description="Make a specific color transparent in an image.")
    parser.add_argument("input", help="Input image filename")
    parser.add_argument("output", help="Output image filename")
    parser.add_argument("color", help="Hex color to make transparent (e.g. #FFFFFF)")
    parser.add_argument("--tolerance", type=int, default=0, help="Color matching tolerance (0-765, default 0)")

    args = parser.parse_args()

    make_transparent(args.input, args.output, args.color, args.tolerance)

if __name__ == "__main__":
    main()
