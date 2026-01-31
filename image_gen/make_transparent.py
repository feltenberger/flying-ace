import argparse
from PIL import Image
import sys

def get_diff(p1, p2):
    return abs(p1[0] - p2[0]) + abs(p1[1] - p2[1]) + abs(p1[2] - p2[2])

def flood_fill_transparent(img, start_coord, tolerance):
    width, height = img.size
    pixels = img.load()
    
    target_color = pixels[start_coord]
    # If already transparent, skip
    if len(target_color) > 3 and target_color[3] == 0:
        return

    # Queue for BFS
    queue = [start_coord]
    visited = set([start_coord])
    
    while queue:
        x, y = queue.pop(0)
        
        current_val = pixels[x, y]
        pixels[x, y] = (current_val[0], current_val[1], current_val[2], 0)
        
        for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
            nx, ny = x + dx, y + dy
            
            if 0 <= nx < width and 0 <= ny < height:
                if (nx, ny) not in visited:
                    neighbor_color = pixels[nx, ny]
                    
                    if len(neighbor_color) > 3 and neighbor_color[3] == 0:
                        visited.add((nx, ny))
                        continue
                        
                    diff = get_diff(neighbor_color, target_color)
                    
                    if diff <= tolerance:
                        visited.add((nx, ny))
                        queue.append((nx, ny))

def apply_soft_edge(img, corner_coords, solid_tolerance, feather_range=50):
    """
    Scans for pixels that are OPAQUE but adjacent to TRANSPARENT pixels (the edge).
    If they match the background color within feather_range, reduce their alpha.
    """
    width, height = img.size
    pixels = img.load()
    ref_color = pixels[corner_coords]
    
    print(f"Applying soft edge feathering (range {feather_range}) to edges only...")
    
    # Create a set of pixels to modify to avoid modifying while iterating
    to_modify = {}
    
    # We only want to process the boundary.
    # A simple way: Iterate all. If pixel is Opaque AND has a Transparent neighbor -> It's an edge.
    
    for y in range(height):
        for x in range(width):
            pixel = pixels[x, y]
            
            # Skip if already transparent
            if pixel[3] == 0:
                continue
            
            # Check neighbors for transparency
            is_edge = False
            for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
                nx, ny = x + dx, y + dy
                if 0 <= nx < width and 0 <= ny < height:
                    if pixels[nx, ny][3] == 0:
                        is_edge = True
                        break
            
            if is_edge:
                diff = get_diff(pixel, ref_color)
                
                # If it's within the feather range
                if diff < (solid_tolerance + feather_range):
                    if diff <= solid_tolerance:
                        new_alpha = 0
                    else:
                        factor = (diff - solid_tolerance) / feather_range
                        new_alpha = int(255 * factor)
                    
                    to_modify[(x, y)] = (pixel[0], pixel[1], pixel[2], new_alpha)

    # Apply changes
    for coord, val in to_modify.items():
        pixels[coord] = val

def make_transparent_flood(input_path, output_path, tolerance=30, feather=0):
    try:
        img = Image.open(input_path)
        img = img.convert("RGBA")
        
        width, height = img.size
        
        corners = [(0, 0), (width-1, 0), (0, height-1), (width-1, height-1)]
        
        print(f"Processing {input_path} ({width}x{height}) with tolerance {tolerance}...")
        
        # Capture reference before modification
        ref_color = img.getpixel((0,0))
        
        for corner in corners:
            flood_fill_transparent(img, corner, tolerance)
            
        if feather > 0:
            # We run this iteratively? No, just once for the immediate halo is usually enough.
            # If the halo is thick, we might need 2 passes. Let's do 1 for now.
            apply_soft_edge(img, (0,0), tolerance, feather_range=feather)
        
        img.save(output_path, "PNG")
        print(f"Successfully saved to {output_path}")
        
    except Exception as e:
        print(f"Error: {e}")

def main():
    parser = argparse.ArgumentParser(description="Make background transparent using flood fill.")
    parser.add_argument("input", help="Input image filename")
    parser.add_argument("output", help="Output image filename")
    parser.add_argument("--tolerance", type=int, default=30, help="Solid matching tolerance (default 30)")
    parser.add_argument("--feather", type=int, default=0, help="Soft edge feather range (default 0)")

    args = parser.parse_args()

    make_transparent_flood(args.input, args.output, args.tolerance, args.feather)

if __name__ == "__main__":
    main()