"""
c2pa-python wrapper — read-only provenance check.

If a C2PA manifest is found → labels += "disclosed_ai_content".
Never halts or blocks; continues regardless of result.
"""

import io
import os
import tempfile

import c2pa


def check_provenance(image_bytes: bytes) -> bool:
    """
    Check whether the image carries a C2PA content-credentials manifest.

    Returns True if a manifest is found, False otherwise.
    Wrapped in try/except — any failure returns False.
    """
    print("[Provenance] Checking C2PA manifest...")
    fd, temp_path = tempfile.mkstemp(suffix=".jpg")
    try:
        with os.fdopen(fd, "wb") as f:
            f.write(image_bytes)

        try:
            reader = c2pa.Reader.try_create(temp_path)
            if reader is not None:
                print(f"[Provenance] C2PA manifest FOUND — {reader.json()[:200]}...")
                return True
            else:
                print("[Provenance] No C2PA manifest found.")
                return False
        except Exception as exc:
            print(f"[Provenance] No C2PA manifest: {exc}")
            return False
    except Exception as exc:
        print(f"[Provenance] Error during provenance check: {exc}")
        return False
    finally:
        try:
            if os.path.exists(temp_path):
                os.unlink(temp_path)
        except OSError:
            pass
