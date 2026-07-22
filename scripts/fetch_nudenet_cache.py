import os
import shutil
from nudenet import NudeDetector

print("Initializing NudeDetector...")
detector = NudeDetector()
print("Initialized.")

possible_paths = [
    os.path.expanduser("~/.NudeNet/640m.onnx"),
    os.path.expanduser("~/.NudeNet/320m.onnx"),
]

if hasattr(detector, 'onnx_detector'):
    print(f"model_path attr: {getattr(detector.onnx_detector, 'model_path', 'Not found')}")

found = False
for path in possible_paths:
    if os.path.exists(path):
        print(f"Found model at: {path}")
        os.makedirs("models/nsfw_nudenet", exist_ok=True)
        shutil.copy2(path, "models/nsfw_nudenet/detector.onnx")
        print("Copied to models/nsfw_nudenet/detector.onnx")
        found = True
        break

if not found:
    print("Could not find the downloaded model file.")
