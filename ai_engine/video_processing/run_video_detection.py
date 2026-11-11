"""
UrbanSense AI - Video Object Detection CLI Runner

Command-line entry point to run YOLO11n object detection on road video streams.
"""

import argparse
import json
import os
from pathlib import Path
import sys

# Ensure project root is in sys.path
SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from ai_engine.detection.detector import GeneralObjectDetector
from ai_engine.video_processing.video_processor import VideoProcessor


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="UrbanSense AI - Run YOLO11n object detection on a video stream."
    )
    parser.add_argument(
        "--input", "-i",
        required=True,
        type=str,
        help="Path to input video file (.mp4, .mov, etc.)",
    )
    parser.add_argument(
        "--output", "-o",
        type=str,
        default=None,
        help="Path for saving annotated output video (default: data/videos/annotated_<filename>)",
    )
    parser.add_argument(
        "--summary", "-s",
        type=str,
        default=None,
        help="Path for saving JSON detection summary (default: data/videos/summary_<filename>.json)",
    )
    parser.add_argument(
        "--conf", "-c",
        type=float,
        default=0.25,
        help="Detection confidence threshold [0.0 - 1.0] (default: 0.25)",
    )
    parser.add_argument(
        "--stride",
        type=int,
        default=1,
        help="Run inference on every N-th frame (default: 1)",
    )
    parser.add_argument(
        "--device",
        type=str,
        default=None,
        help="Inference device override ('mps', 'cpu'). Defaults to auto-detect MPS/CPU.",
    )
    parser.add_argument(
        "--model-path",
        type=str,
        default=None,
        help="Path to YOLO weights file (default: ai_engine/models/yolo11n.pt)",
    )
    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()

    input_path = Path(args.input).resolve()
    if not input_path.is_file():
        print(f"Error: Input video not found at: {input_path}", file=sys.stderr)
        return 1

    # Generate default output paths if not provided
    base_stem = input_path.stem
    output_dir = REPO_ROOT / "data" / "videos"
    output_dir.mkdir(parents=True, exist_ok=True)

    output_video_path = (
        Path(args.output).resolve()
        if args.output
        else output_dir / f"annotated_{base_stem}.mp4"
    )
    summary_json_path = (
        Path(args.summary).resolve()
        if args.summary
        else output_dir / f"summary_{base_stem}.json"
    )

    print("=== UrbanSense AI - Video Object Detection ===")
    print(f"Input video:        {input_path}")
    print(f"Output video:       {output_video_path}")
    print(f"Summary JSON:       {summary_json_path}")
    print(f"Confidence cutoff:  {args.conf}")
    print(f"Frame stride:       {args.stride}")

    try:
        detector = GeneralObjectDetector(
            model_path=args.model_path,
            device=args.device,
        )
        print(f"Model:              {detector.model_name}")
        print(f"Device:             {detector.device}")
        print("Processing video stream...")

        processor = VideoProcessor(detector=detector)
        summary = processor.process_video(
            input_path=input_path,
            output_path=output_video_path,
            summary_path=summary_json_path,
            conf_threshold=args.conf,
            frame_stride=args.stride,
        )

        print("\n=== Video Processing Completed Successfully ===")
        print(f"Total video frames:          {summary.actual_frame_count}")
        print(f"Inference frames processed:  {summary.processed_frame_count}")
        print(f"Duration:                    {summary.processing_duration_seconds:.2f}s")
        if summary.processing_duration_seconds > 0:
            effective_fps = summary.actual_frame_count / summary.processing_duration_seconds
            print(f"Throughput:                  {effective_fps:.1f} FPS")
        print("\nDetection Observations by Class:")
        if summary.per_class_observation_counts:
            for cls_name, count in sorted(
                summary.per_class_observation_counts.items(),
                key=lambda x: x[1],
                reverse=True,
            ):
                print(f"  - {cls_name}: {count}")
        else:
            print("  (No objects detected above confidence threshold)")

        print(f"\nAnnotated video saved: {output_video_path}")
        print(f"Summary saved:         {summary_json_path}")
        return 0

    except Exception as err:
        print(f"\nProcessing Error: {err}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())

