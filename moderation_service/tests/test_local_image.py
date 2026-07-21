"""
Utility script to test local images against the moderation pipeline directly.
Bypasses the API (no URLs needed).

Usage:
  python tests/test_local_image.py path/to/your/image.jpg
"""

import sys
import os

# Ensure moderation_service is in the path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import nsfw
import deepfake
import provenance

def main():
    if len(sys.argv) < 2:
        print("Usage: python tests/test_local_image.py <path_to_image>")
        sys.exit(1)

    image_path = sys.argv[1]
    if not os.path.exists(image_path):
        print(f"Error: File not found: {image_path}")
        sys.exit(1)

    print(f"\n🔍 Testing local image: {image_path}")
    print("=" * 60)

    with open(image_path, "rb") as f:
        image_bytes = f.read()

    # 1. NudeNet
    print("\n--- 1. NudeNet (NSFW) ---")
    nsfw_res = nsfw.analyze(image_bytes)
    print(f"Status: {nsfw_res['status']}")
    print(f"Labels: {nsfw_res['labels']}")
    print(f"Explicit Confidence: {nsfw_res['explicit_confidence']:.2%}")

    if nsfw_res['status'] == "blocked":
        print("\nPipeline halted (Image is blocked due to explicit content).")
        return

    # 2. C2PA Provenance
    print("\n--- 2. C2PA Provenance ---")
    has_manifest = provenance.check_provenance(image_bytes)
    print(f"Manifest Found: {has_manifest}")

    # 3. Deepfake
    print("\n--- 3. Deepfake (SigLIP2 + YOLO) ---")
    df_res = deepfake.analyze(image_bytes)
    print(f"Fake Confidence: {df_res['deepfake_confidence']:.2%}")
    print(f"Labels: {df_res['labels']}")

    print("\n✅ Done!")

if __name__ == "__main__":
    main()
