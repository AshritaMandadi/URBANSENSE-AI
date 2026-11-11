import os
import sys
from pathlib import Path

# Ensure Ultralytics uses a writable configuration directory
if "YOLO_CONFIG_DIR" not in os.environ:
    os.environ["YOLO_CONFIG_DIR"] = "/tmp"

try:
    import torch
    from ultralytics import YOLO
except ImportError as err:
    print(f"Error importing dependencies: {err}")
    print("PyTorch or Ultralytics is not installed in the active environment.")
    sys.exit(1)


def find_model_weights(model_name: str = "yolo11n.pt") -> str:
    """Locate the model weights file within the repository or return model_name."""
    # 1. Current working directory
    if Path(model_name).is_file():
        return str(Path(model_name).resolve())

    # 2. ai_engine/models/ relative to script
    script_dir = Path(__file__).resolve().parent
    models_dir = script_dir.parent / "models" / model_name
    if models_dir.is_file():
        return str(models_dir)

    # 3. Project root relative to script
    repo_root = script_dir.parent.parent / model_name
    if repo_root.is_file():
        return str(repo_root)

    return model_name


def main():
    model_name = "yolo11n.pt"
    pytorch_version = torch.__version__
    device = "mps" if torch.backends.mps.is_available() else "cpu"

    print("=== UrbanSense AI - YOLO Initialization Test ===")
    print(f"Model name: {model_name}")
    print(f"PyTorch version: {pytorch_version}")
    print(f"Selected device: {device}")

    model_path = find_model_weights(model_name)

    try:
        print(f"Loading pretrained model from: {model_path}...")
        model = YOLO(model_path)
        model.to(device)
        print("Initialization: Success")
        print("UrbanSense AI detection environment is ready.")
        return 0
    except Exception as err:
        print(f"Initialization: Failure ({err})")
        return 1


if __name__ == "__main__":
    sys.exit(main())
