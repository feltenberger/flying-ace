# Image Generation

## Overview

Uses **Google GenAI API** (Nanobanana) to generate WW2 propaganda poster style artwork for the game. All scripts live in this directory with bundled Python dependencies in `.packages_new/`.

## Prerequisites

```bash
export GOOGLE_GENAI_API_KEY=<your-key>  # from https://aistudio.google.com/api-keys
```

## Scripts

| Script | Purpose | Usage |
|---|---|---|
| `generate_image.py` | Generate a single image | `./run_gen.sh <output.png> "<prompt>"` |
| `list_models.py` | List available GenAI models | `python3 image_gen/list_models.py` |

The `run_gen.sh` wrapper sets `PYTHONPATH` to include `.packages_new/` so the bundled deps are found. If you haven't installed the necessary packages please do so. They're essentially the google genai python packages.

## Batch Generation Workflow

1. Edit `images_to_generate.txt` to add/modify image specs
2. Each entry follows the format: `N. filename.png (dimensions)\n<prompt> [style suffix]`
3. The style suffix defined at the top of the file is automatically appended to every prompt
4. Claude should generate command line calls to run_gen.sh for each image.

## Image Spec Format (`images_to_generate.txt`)

- **34 images** across categories: Backgrounds, Title/Branding, Handover, Die Rolls, Dogfight, Shop Items, Bombs, Game Over, Tax/Maintenance, UI Elements
- Backgrounds are 1920x1080; most game art is 768x768 or 512x512
- The style suffix enforces: "no text, no letters, no words"

## Single Image Generation

```bash
./image_gen/run_gen.sh public/images/my-image.png "A WW2 fighter plane, propaganda poster style"
```

Model defaults to `nano-banana-pro-preview`. Override with `--model <name>`.

## Output Location

Generated images go in `public/images/default/` and are served via the `useImages()` hook (see `src/utils/images.ts`). The image set system supports multiple themes but currently only `default` exists.
