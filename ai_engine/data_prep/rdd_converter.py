"""
UrbanSense AI - RDD2022 India Pascal VOC to YOLO Annotation Converter

Converts Pascal VOC XML bounding box annotations to normalized YOLO TXT format:
    class_id x_center y_center width height

Target Classes (Strict 4-Class Taxonomy):
    0: longitudinal_crack (D00)
    1: transverse_crack (D10)
    2: alligator_crack (D20)
    3: pothole (D40)

Enforces sequence-aware train/val splitting to avoid data leakage between
consecutive video frames. Tracks unsupported classes and audit metrics.
"""

from collections import defaultdict
import json
import math
import os
from pathlib import Path
import random
import shutil
from typing import Dict, List, Optional, Tuple
import xml.etree.ElementTree as ET

import cv2

try:
    import yaml
    def save_yaml(path: Path, data: dict):
        with open(path, "w") as f:
            yaml.dump(data, f, sort_keys=False)
except ImportError:
    os.environ.setdefault("YOLO_CONFIG_DIR", "/tmp")
    from ultralytics.utils import YAML
    def save_yaml(path: Path, data: dict):
        YAML.save(path, data)

CLASS_MAPPING: Dict[str, int] = {
    "D00": 0,  # Longitudinal crack
    "D10": 1,  # Transverse crack
    "D20": 2,  # Alligator crack
    "D40": 3,  # Pothole
}

CLASS_NAMES: List[str] = [
    "longitudinal_crack",
    "transverse_crack",
    "alligator_crack",
    "pothole",
]


def parse_voc_xml(
    xml_path: Path,
    image_path: Optional[Path] = None,
) -> Tuple[List[str], Dict[str, int], int]:
    """
    Parse a single Pascal VOC XML file into YOLO normalized annotation lines.

    Returns:
        tuple: (yolo_lines, class_counts, invalid_box_count)
    """
    if not xml_path.is_file():
        raise FileNotFoundError(f"XML annotation not found: {xml_path}")

    try:
        tree = ET.parse(xml_path)
        root = tree.getroot()
    except Exception as err:
        raise ValueError(f"Corrupt XML file {xml_path}: {err}")

    # Extract image dimensions
    width = 0
    height = 0
    size_elem = root.find("size")
    if size_elem is not None:
        w_text = size_elem.findtext("width", "0")
        h_text = size_elem.findtext("height", "0")
        try:
            width = int(w_text)
            height = int(h_text)
        except ValueError:
            width, height = 0, 0

    # Fallback to image header if XML size is missing or invalid
    if (width <= 0 or height <= 0) and image_path and image_path.is_file():
        img = cv2.imread(str(image_path))
        if img is not None:
            height, width = img.shape[:2]

    if width <= 0 or height <= 0:
        raise ValueError(f"Invalid image dimensions ({width}x{height}) for {xml_path}")

    yolo_lines: List[str] = []
    class_counts: Dict[str, int] = defaultdict(int)
    invalid_box_count = 0

    for obj in root.findall("object"):
        name_elem = obj.find("name")
        if name_elem is None or not name_elem.text:
            continue
        raw_name = name_elem.text.strip()

        # Check if class is one of the 4 target distress types
        if raw_name not in CLASS_MAPPING:
            # Track unsupported class
            class_counts[raw_name] += 1
            continue

        bndbox = obj.find("bndbox")
        if bndbox is None:
            invalid_box_count += 1
            continue

        try:
            xmin = float(bndbox.findtext("xmin", "0"))
            ymin = float(bndbox.findtext("ymin", "0"))
            xmax = float(bndbox.findtext("xmax", "0"))
            ymax = float(bndbox.findtext("ymax", "0"))
        except ValueError:
            invalid_box_count += 1
            continue

        # Clamp box to image boundaries
        xmin = max(0.0, min(xmin, float(width)))
        ymin = max(0.0, min(ymin, float(height)))
        xmax = max(0.0, min(xmax, float(width)))
        ymax = max(0.0, min(ymax, float(height)))

        box_w = xmax - xmin
        box_h = ymax - ymin

        # Discard degenerate zero/negative area boxes
        if box_w <= 1.0 or box_h <= 1.0:
            invalid_box_count += 1
            continue

        class_id = CLASS_MAPPING[raw_name]
        class_counts[raw_name] += 1

        # Calculate normalized YOLO format
        x_center = (xmin + xmax) / 2.0 / width
        y_center = (ymin + ymax) / 2.0 / height
        norm_w = box_w / width
        norm_h = box_h / height

        # Final bounds validation
        if not (0.0 <= x_center <= 1.0 and 0.0 <= y_center <= 1.0 and 0.0 < norm_w <= 1.0 and 0.0 < norm_h <= 1.0):
            invalid_box_count += 1
            continue

        yolo_lines.append(f"{class_id} {x_center:.6f} {y_center:.6f} {norm_w:.6f} {norm_h:.6f}")

    return yolo_lines, dict(class_counts), invalid_box_count


def split_sequence_blocks(
    image_names: List[str],
    val_ratio: float = 0.2,
    block_size: int = 15,
    seed: int = 42,
) -> Tuple[List[str], List[str]]:
    """
    Split sorted image filenames into train and val using block-based sequence grouping.
    Prevents temporal data leakage between adjacent video frames.
    """
    sorted_names = sorted(image_names)
    # Group names into blocks of consecutive frames
    blocks = [sorted_names[i : i + block_size] for i in range(0, len(sorted_names), block_size)]

    rng = random.Random(seed)
    rng.shuffle(blocks)

    val_count = int(math.ceil(len(sorted_names) * val_ratio))
    val_names: List[str] = []
    train_names: List[str] = []

    for block in blocks:
        if len(val_names) < val_count:
            val_names.extend(block)
        else:
            train_names.extend(block)

    return sorted(train_names), sorted(val_names)


def convert_rdd2022_india(
    raw_india_dir: Path,
    output_dir: Path,
    val_ratio: float = 0.2,
    seed: int = 42,
) -> dict:
    """
    Main conversion pipeline:
    Parses Pascal VOC annotations, converts to YOLO TXT, splits into train/val,
    and produces dataset.yaml and dataset_audit.json.
    """
    train_img_dir = raw_india_dir / "train" / "images"
    train_xml_dir = raw_india_dir / "train" / "annotations" / "xmls"
    test_img_dir = raw_india_dir / "test" / "images"

    if not train_img_dir.is_dir():
        raise FileNotFoundError(f"Training images directory not found: {train_img_dir}")
    if not train_xml_dir.is_dir():
        raise FileNotFoundError(f"XML annotations directory not found: {train_xml_dir}")

    raw_train_images = sorted([p for p in train_img_dir.glob("*.jpg")])
    raw_xml_files = sorted([p for p in train_xml_dir.glob("*.xml")])
    raw_test_images = sorted([p for p in test_img_dir.glob("*.jpg")]) if test_img_dir.is_dir() else []

    # Map stems for fast cross-referencing
    xml_map = {p.stem: p for p in raw_xml_files}
    img_map = {p.stem: p for p in raw_train_images}

    train_out_img = output_dir / "images" / "train"
    val_out_img = output_dir / "images" / "val"
    train_out_lbl = output_dir / "labels" / "train"
    val_out_lbl = output_dir / "labels" / "val"

    for d in (train_out_img, val_out_img, train_out_lbl, val_out_lbl):
        d.mkdir(parents=True, exist_ok=True)

    # Perform sequence-aware train/val split
    all_stems = sorted(list(img_map.keys()))
    train_stems, val_stems = split_sequence_blocks(all_stems, val_ratio=val_ratio, seed=seed)
    train_stem_set = set(train_stems)

    target_class_counts: Dict[str, int] = defaultdict(int)
    unsupported_class_counts: Dict[str, int] = defaultdict(int)
    images_with_defects = 0
    clean_background_images = 0
    total_invalid_boxes = 0
    missing_xml_count = 0

    print(f"Converting {len(all_stems)} training images ({len(train_stems)} train, {len(val_stems)} val)...")

    for stem in all_stems:
        img_src = img_map[stem]
        xml_src = xml_map.get(stem)

        is_train = stem in train_stem_set
        dest_img_dir = train_out_img if is_train else val_out_img
        dest_lbl_dir = train_out_lbl if is_train else val_out_lbl

        # Symlink or copy image into split directory
        dest_img_path = dest_img_dir / img_src.name
        if not dest_img_path.exists():
            shutil.copy2(img_src, dest_img_path)

        dest_lbl_path = dest_lbl_dir / f"{stem}.txt"

        if xml_src is None or not xml_src.is_file():
            missing_xml_count += 1
            # Empty label file for background sample
            dest_lbl_path.write_text("")
            clean_background_images += 1
            continue

        yolo_lines, class_counts, invalid_boxes = parse_voc_xml(xml_src, img_src)
        total_invalid_boxes += invalid_boxes

        # Accumulate class counts
        for cls_name, count in class_counts.items():
            if cls_name in CLASS_MAPPING:
                target_class_counts[cls_name] += count
            else:
                unsupported_class_counts[cls_name] += count

        if yolo_lines:
            images_with_defects += 1
            dest_lbl_path.write_text("\n".join(yolo_lines) + "\n")
        else:
            clean_background_images += 1
            dest_lbl_path.write_text("")

    # Generate dataset.yaml
    yaml_content = {
        "path": str(output_dir.resolve()),
        "train": "images/train",
        "val": "images/val",
        "names": {i: name for i, name in enumerate(CLASS_NAMES)},
    }
    yaml_path = output_dir / "dataset.yaml"
    save_yaml(yaml_path, yaml_content)

    # Generate dataset_audit.json
    audit_data = {
        "dataset_name": "RDD2022_India",
        "official_source": "https://github.com/sekilab/RoadDamageDetector",
        "figshare_doi": "10.6084/m9.figshare.21431547",
        "raw_counts": {
            "training_images": len(raw_train_images),
            "training_xmls": len(raw_xml_files),
            "test_images_unlabeled": len(raw_test_images),
            "missing_xml_annotations": missing_xml_count,
        },
        "conversion_summary": {
            "total_prepared_images": len(all_stems),
            "train_split_count": len(train_stems),
            "val_split_count": len(val_stems),
            "val_ratio": val_ratio,
            "images_with_defects": images_with_defects,
            "clean_background_images": clean_background_images,
            "invalid_boxes_discarded": total_invalid_boxes,
        },
        "target_class_distribution": {
            f"{cls} ({CLASS_NAMES[CLASS_MAPPING[cls]]})": target_class_counts.get(cls, 0)
            for cls in ("D00", "D10", "D20", "D40")
        },
        "unsupported_classes_ignored": dict(unsupported_class_counts),
        "license_info": {
            "figshare_license": "CC BY 4.0",
            "challenge_rules_license": "CC BY-SA 4.0",
            "notes": "Challenge guidelines cite CC BY-SA 4.0 while Figshare catalog lists CC BY 4.0. Both permit academic/commercial adaptation with attribution.",
        },
    }

    audit_path = output_dir / "dataset_audit.json"
    with open(audit_path, "w") as f:
        json.dump(audit_data, f, indent=2)

    print("\n=== RDD2022 India Conversion Audit Completed ===")
    print(f"Target Class Detections:")
    for cls_desc, count in audit_data["target_class_distribution"].items():
        print(f"  - {cls_desc}: {count}")
    print(f"Train / Val Split: {len(train_stems)} / {len(val_stems)}")
    print(f"Output: {output_dir}")
    return audit_data


if __name__ == "__main__":
    repo_root = Path(__file__).resolve().parent.parent.parent
    raw_india = repo_root / "datasets" / "rdd2022" / "raw" / "India"
    out_dir = repo_root / "datasets" / "rdd2022"

    if raw_india.is_dir():
        convert_rdd2022_india(raw_india, out_dir)
    else:
        print(f"Error: {raw_india} does not exist yet. Please download the dataset first.")
