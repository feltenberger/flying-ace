#!/bin/bash
# Get the absolute path of the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

# Set PYTHONPATH to include our local .packages directory
export PYTHONPATH="$SCRIPT_DIR/.packages_new:$PYTHONPATH"

# Run the python script with the arguments passed to this shell script
python3 "$SCRIPT_DIR/generate_image.py" "$@"
