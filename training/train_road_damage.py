"""
UrbanSense AI - YOLO11n Road Damage Model Training Script

Configured for training on NVIDIA GPUs (Kaggle P100/T4, Google Colab, or AWS EC2).
Trains YOLO11n on the 4-class RDD2022 India road damage dataset:
    Class 0: longitudinal_crack (D00)
    Class 1: transverse_crack (D10)
    Class 2: alligator_crack (D20)
    Class 3: pothole (D40)

DO NOT run training locally on 8 GB MacBook Air. Run this script in a cloud GPU
session and transfer the resulting `best.pt` to `ai_engine/models/road_damage_yolo11n.pt`.
"""

import argparse
import os
from pathlib import Path
import sys

os.environ.setdefault("YOLO_CONFIG_DIR", "/tmp")

from ultralytics import YOLO


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="UrbanSense AI - Train YOLO11n on RDD2022 Road Damage Dataset"
    )
    parser.add_argument(
        "--data",
        type=str,
        default="datasets/rdd2022/dataset.yaml",
        help="Path to dataset.yaml configuration file",
    )
    parser.add_argument(
        "--dataset-root",
        type=str,
        default=None,
        help="Optional override for dataset root directory (e.g., /kaggle/input/rdd2022 or /content/datasets/rdd2022)",
    )
    parser.add_argument(
        "--model",
        type=str,
        default="yolo11n.pt",
        help="Base model architecture / pretrained weights (e.g., yolo11n.pt)",
    )
    parser.add_argument(
        "--imgsz",
        type=int,
        default=640,
        help="Input image resolution in pixels (default: 640)",
    )
    parser.add_argument(
        "--batch",
        type=int,
        default=8,
        help="Training batch size (default: 8, increase if GPU VRAM allows)",
    )
    parser.add_argument(
        "--epochs",
        type=int,
        default=50,
        help="Maximum training epochs (default: 50)",
    )
    parser.add_argument(
        "--patience",
        type=int,
        default=10,
        help="Early stopping patience in epochs without improvement (default: 10)",
    )
    parser.add_argument(
        "--device",
        type=str,
        default="0",
        help="Compute device: '0' for first NVIDIA GPU, 'mps' for Apple Silicon, 'cpu' for fallback",
    )
    parser.add_argument(
        "--workers",
        type=int,
        default=2,
        help="DataLoader worker processes (default: 2)",
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=42,
        help="Random seed for reproducible training runs (default: 42)",
    )
    parser.add_argument(
        "--project",
        type=str,
        default="runs/train_road_damage",
        help="Directory where training runs and weights are saved",
    )
    parser.add_argument(
        "--name",
        type=str,
        default="yolo11n_rdd2022_india",
        help="Experiment run identifier name",
    )
    parser.add_argument(
        "--resume",
        action="store_true",
        help="Resume training from the most recent checkpoint",
    )
    parser.add_argument(
        "--optimizer",
        type=str,
        default="AdamW",
        choices=["SGD", "Adam", "AdamW", "auto"],
        help="Optimizer type (default: AdamW)",
    )
    parser.add_argument(
        "--lr0",
        type=float,
        default=0.001,
        help="Initial learning rate (default: 0.001 for AdamW)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Validate parameters and model config without launching full training",
    )
    return parser


def prepare_dataset_yaml(data_arg: str, dataset_root_override: str = None) -> Path:
    """Ensure dataset YAML exists and points to valid directory; generate portable YAML if needed."""
    from ultralytics.utils import YAML

    data_path = Path(data_arg)

    if dataset_root_override:
        root_path = Path(dataset_root_override).resolve()
        if not root_path.is_dir():
            raise FileNotFoundError(f"Specified --dataset-root directory not found: {root_path}")
        runtime_yaml = Path("runs") / "dataset_runtime.yaml"
        runtime_yaml.parent.mkdir(parents=True, exist_ok=True)
        yaml_content = {
            "path": str(root_path),
            "train": "images/train",
            "val": "images/val",
            "names": {
                0: "longitudinal_crack",
                1: "transverse_crack",
                2: "alligator_crack",
                3: "pothole",
            },
        }
        YAML.save(runtime_yaml, yaml_content)
        print(f"Generated runtime dataset YAML pointing to: {root_path}")
        return runtime_yaml.resolve()

    resolved = data_path.resolve()
    if not resolved.is_file():
        raise FileNotFoundError(
            f"Dataset configuration not found at: {resolved}. "
            "Please check path or supply --dataset-root."
        )
    return resolved


def train_road_damage(args: argparse.Namespace) -> None:
    data_path = prepare_dataset_yaml(args.data, args.dataset_root)

    print("=== UrbanSense AI - Road Damage Model Training Configuration ===")
    print(f"Dataset YAML:        {data_path}")
    print(f"Base Model:          {args.model}")
    print(f"Image Resolution:    {args.imgsz}x{args.imgsz}")
    print(f"Batch Size:          {args.batch}")
    print(f"Epochs:              {args.epochs}")
    print(f"Early Stopping:      {args.patience} epochs patience")
    print(f"Random Seed:         {args.seed}")
    print(f"DataLoader Workers:  {args.workers}")
    print(f"Compute Device:      {args.device}")
    print(f"Optimizer:           {args.optimizer} (lr0={args.lr0})")
    print(f"Output Project:      {args.project}/{args.name}")
    print("Augmentation Guard:  degrees=0.0, flipud=0.0 (prevents D00/D10 orientation corruption)")

    # Load base YOLO model
    print(f"\nInitializing model '{args.model}'...")
    model = YOLO(args.model)

    if args.dry_run:
        print("\n[Dry Run] Model and dataset configuration successfully validated.")
        print("Ready for GPU execution. To train, omit the --dry-run flag.")
        return

    # Launch full training loop with crack-safe augmentations
    print("\nStarting Ultralytics training loop...")
    try:
        results = model.train(
            data=str(data_path),
            epochs=args.epochs,
            patience=args.patience,
            batch=args.batch,
            imgsz=args.imgsz,
            device=args.device,
            workers=args.workers,
            seed=args.seed,
            project=args.project,
            name=args.name,
            resume=args.resume,
            optimizer=args.optimizer,
            lr0=args.lr0,
            save=True,
            save_period=5,
            val=True,
            plots=True,
            verbose=True,
            # Orientation-safe augmentations
            degrees=0.0,      # NEVER rotate: longitudinal (D00) becomes transverse (D10)
            fliplr=0.5,       # Horizontal flip preserves orientation
            flipud=0.0,       # Inverted vertical road perspective is invalid
            mixup=0.0,        # No mixup to avoid confusing subtle crack patterns
            mosaic=1.0,       # Multi-crop mosaic is safe and effective
        )
    except RuntimeError as err:
        if "out of memory" in str(err).lower() or "cuda oom" in str(err).lower():
            print("\n❌ GPU Out-of-Memory (OOM) Error encountered!")
            print("Recommendations:")
            print("  1. Reduce batch size to --batch 4")
            print("  2. Reduce image size to --imgsz 512")
            print("  3. Lower workers to --workers 1")
            raise
        raise

    print("\n=== Training Completed Successfully ===")
    best_weights = Path(args.project) / args.name / "weights" / "best.pt"
    print(f"Best model weights saved to: {best_weights}")
    print("\nDeployment Instructions:")
    print("1. Download `best.pt` from the cloud environment.")
    print("2. Copy to: `ai_engine/models/road_damage_yolo11n.pt`")
    print("3. Verify with: `.venv/bin/python -m unittest tests/test_backend.py`")


def main():
    parser = build_parser()
    args = parser.parse_args()
    train_road_damage(args)


if __name__ == "__main__":
    main()

