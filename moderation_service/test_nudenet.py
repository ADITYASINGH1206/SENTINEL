from nsfw import _get_detector
from dotenv import load_dotenv
import os

def main():
    load_dotenv()
    try:
        print("Testing NudeNet detector initialization...")
        detector = _get_detector()
        if detector == "DISABLED":
            print("FAILED: Detector is disabled.")
        else:
            print(f"SUCCESS: Detector initialized: {detector}")
            
    except Exception as e:
        print(f"FAILED with error: {e}")

if __name__ == '__main__':
    main()
