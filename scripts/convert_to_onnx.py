"""
One-time ONNX conversion script for Sentinel ML models.

Usage:
    python scripts/convert_to_onnx.py --model swinv2_deepfake
    python scripts/convert_to_onnx.py --model nudenet
    python scripts/convert_to_onnx.py --all

Requirements (install ONCE, not needed at runtime):
    pip install torch transformers optimum onnx onnxruntime numpy Pillow
"""

import argparse
import os
import sys
import shutil

MODELS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "models")


def convert_swinv2_deepfake():
    """
    Convert haywoodsloan/ai-image-detector-deploy (SwinV2) to ONNX FP16.
    Output: models/swinv2_deepfake/model.onnx + preprocessor_config.json
    """
    output_dir = os.path.join(MODELS_DIR, "swinv2_deepfake")
    os.makedirs(output_dir, exist_ok=True)

    model_id = "haywoodsloan/ai-image-detector-deploy"
    print(f"\n{'='*60}")
    print(f"[SwinV2] Converting {model_id} to ONNX FP16...")
    print(f"[SwinV2] Output: {output_dir}")
    print(f"{'='*60}\n")

    from transformers import AutoModelForImageClassification, AutoImageProcessor
    import torch
    import numpy as np

    # Step 1: Download model and processor
    print("[SwinV2] Downloading model from HuggingFace...")
    model = AutoModelForImageClassification.from_pretrained(model_id)
    processor = AutoImageProcessor.from_pretrained(model_id)
    model.eval()

    # Save preprocessor config
    processor.save_pretrained(output_dir)
    print(f"[SwinV2] Saved preprocessor config to {output_dir}")

    # Save label mapping
    import json
    label_map = model.config.id2label
    with open(os.path.join(output_dir, "id2label.json"), "w") as f:
        json.dump(label_map, f, indent=2)
    print(f"[SwinV2] Saved label mapping: {label_map}")

    # Step 2: Create dummy input
    # SwinV2 typically expects 256x256 or 224x224
    image_size = getattr(processor, "size", {})
    h = image_size.get("height", 256)
    w = image_size.get("width", 256)
    print(f"[SwinV2] Model input size: {h}x{w}")

    dummy_input = torch.randn(1, 3, h, w)

    # Step 3: Export to ONNX
    onnx_path = os.path.join(output_dir, "model.onnx")
    print(f"[SwinV2] Exporting to ONNX...")

    torch.onnx.export(
        model,
        dummy_input,
        onnx_path,
        opset_version=14,
        input_names=["pixel_values"],
        output_names=["logits"],
        dynamic_axes={
            "pixel_values": {0: "batch_size"},
            "logits": {0: "batch_size"},
        },
    )
    print(f"[SwinV2] Exported to {onnx_path}")

    # Step 4: Convert to FP16
    print("[SwinV2] Converting to FP16...")
    try:
        import onnx
        from onnx import numpy_helper
        
        onnx_model = onnx.load(onnx_path)
        
        # Convert float32 initializers to float16
        from onnx import TensorProto
        for initializer in onnx_model.graph.initializer:
            if initializer.data_type == TensorProto.FLOAT:
                arr = numpy_helper.to_array(initializer).astype(np.float16)
                new_init = numpy_helper.from_array(arr, name=initializer.name)
                new_init.data_type = TensorProto.FLOAT16
                initializer.CopyFrom(new_init)
        
        fp16_path = os.path.join(output_dir, "model_fp16.onnx")
        onnx.save(onnx_model, fp16_path)
        
        # Replace original with fp16
        os.replace(fp16_path, onnx_path)
        print(f"[SwinV2] FP16 conversion complete: {onnx_path}")
    except Exception as e:
        print(f"[SwinV2] WARNING: FP16 conversion failed ({e}), keeping FP32 model")

    # Step 5: Verify
    print("[SwinV2] Verifying ONNX model...")
    import onnxruntime as ort
    session = ort.InferenceSession(onnx_path, providers=["CPUExecutionProvider"])
    inp = session.get_inputs()[0]
    out = session.get_outputs()[0]
    print(f"[SwinV2] Input: name={inp.name}, shape={inp.shape}, type={inp.type}")
    print(f"[SwinV2] Output: name={out.name}, shape={out.shape}, type={out.type}")

    # Test inference
    test_input = np.random.randn(1, 3, h, w).astype(np.float32)
    result = session.run(None, {"pixel_values": test_input})
    print(f"[SwinV2] Test inference output shape: {result[0].shape}")
    print(f"[SwinV2] ✅ SwinV2 ONNX conversion COMPLETE\n")

    file_size_mb = os.path.getsize(onnx_path) / (1024 * 1024)
    print(f"[SwinV2] Model size: {file_size_mb:.1f} MB")


def fetch_nudenet():
    """
    Fetch NudeNet v3 640m ONNX model and place in models/nsfw_nudenet/.
    NudeNet already distributes ONNX models — we just download the right one.
    Output: models/nsfw_nudenet/detector.onnx
    """
    output_dir = os.path.join(MODELS_DIR, "nsfw_nudenet")
    os.makedirs(output_dir, exist_ok=True)

    print(f"\n{'='*60}")
    print(f"[NudeNet] Fetching NudeNet v3 640m ONNX model...")
    print(f"[NudeNet] Output: {output_dir}")
    print(f"{'='*60}\n")

    import urllib.request

    # NudeNet v3 640m model URL from the official repo
    # The NudeNet package uses this model internally
    model_url = "https://huggingface.co/notAI-tech/NudeNet/resolve/main/640m.onnx"
    output_path = os.path.join(output_dir, "detector.onnx")

    if os.path.exists(output_path):
        file_size_mb = os.path.getsize(output_path) / (1024 * 1024)
        print(f"[NudeNet] Model already exists ({file_size_mb:.1f} MB): {output_path}")
        print("[NudeNet] Skipping download. Delete file to re-download.")
        return

    print(f"[NudeNet] Downloading from {model_url}...")
    try:
        urllib.request.urlretrieve(model_url, output_path)
        file_size_mb = os.path.getsize(output_path) / (1024 * 1024)
        print(f"[NudeNet] Downloaded: {output_path} ({file_size_mb:.1f} MB)")
    except Exception as e:
        print(f"[NudeNet] Download failed: {e}")
        # Fallback: try to copy from nudenet package cache
        print("[NudeNet] Trying to locate model from installed nudenet package...")
        try:
            from nudenet import NudeDetector
            detector = NudeDetector()
            # NudeDetector stores the model path internally
            src = detector.onnx_detector.model_path if hasattr(detector, 'onnx_detector') else None
            if src and os.path.exists(src):
                shutil.copy2(src, output_path)
                print(f"[NudeNet] Copied from package cache: {output_path}")
            else:
                print("[NudeNet] Could not locate model. Please download manually.")
                return
        except ImportError:
            print("[NudeNet] nudenet package not installed. Please install: pip install nudenet")
            return

    # Verify
    print("[NudeNet] Verifying ONNX model...")
    import onnxruntime as ort
    session = ort.InferenceSession(output_path, providers=["CPUExecutionProvider"])
    inp = session.get_inputs()[0]
    print(f"[NudeNet] Input: name={inp.name}, shape={inp.shape}, type={inp.type}")
    print(f"[NudeNet] ✅ NudeNet ONNX fetch COMPLETE\n")


def main():
    parser = argparse.ArgumentParser(description="Convert Sentinel ML models to ONNX")
    parser.add_argument("--model", choices=["swinv2_deepfake", "nudenet"], help="Model to convert")
    parser.add_argument("--all", action="store_true", help="Convert all models")
    args = parser.parse_args()

    os.makedirs(MODELS_DIR, exist_ok=True)
    print(f"Models directory: {MODELS_DIR}")

    if args.all or args.model == "swinv2_deepfake":
        convert_swinv2_deepfake()

    if args.all or args.model == "nudenet":
        fetch_nudenet()

    if not args.all and not args.model:
        parser.print_help()
        sys.exit(1)

    print("\n" + "="*60)
    print("All requested conversions complete!")
    print(f"Models stored in: {MODELS_DIR}")
    print("="*60)


if __name__ == "__main__":
    main()
