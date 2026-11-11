"""
UrbanSense AI - Portable Cloud Training Dataset Bundler

Creates a clean, portable YOLO dataset zip bundle (`datasets/rdd2022_yolo_trainval.zip`)
containing exclusively the prepared train/val images, labels, dataset.yaml, and audit JSON.
Excludes raw source archives, VOC XMLs, and temporary files.
"""

from collections import Counter
import hashlib
import os
from pathlib import Path
import tempfile
import time
from typing import Dict, List, Tuple
import zipfile

try:
    import yaml
    def load_yaml_str(text: str) -> dict:
        return yaml.safe_load(text)
except ImportError:
    os.environ.setdefault("YOLO_CONFIG_DIR", "/tmp")
    from ultralytics.utils import YAML
    def load_yaml_str(text: str) -> dict:
        return YAML(text).parse()


EXPECTED_TRAIN_COUNT = 6161
EXPECTED_VAL_COUNT = 1545
EXPECTED_TOTAL_IMAGES = 7706
EXPECTED_TOTAL_LABELS = 7706
EXPECTED_TOTAL_ENTRIES = 15414  # 7706 images + 7706 labels + 2 metadata files


def collect_bundle_files(dataset_dir: Path) -> List[Tuple[Path, str]]:
    """
    Collect all target files and their relative archive arcnames.
    Enforces strict inclusion of only images/train, images/val, labels/train, labels/val,
    dataset.yaml, and dataset_audit.json.
    """
    files_to_pack: List[Tuple[Path, str]] = []

    # 1. Training images & labels
    train_img_dir = dataset_dir / "images" / "train"
    train_lbl_dir = dataset_dir / "labels" / "train"
    val_img_dir = dataset_dir / "images" / "val"
    val_lbl_dir = dataset_dir / "labels" / "val"

    for d in (train_img_dir, train_lbl_dir, val_img_dir, val_lbl_dir):
        if not d.is_dir():
            raise FileNotFoundError(f"Required directory not found: {d}")

    train_imgs = sorted(list(train_img_dir.glob("*.jpg")))
    train_lbls = sorted(list(train_lbl_dir.glob("*.txt")))
    val_imgs = sorted(list(val_img_dir.glob("*.jpg")))
    val_lbls = sorted(list(val_lbl_dir.glob("*.txt")))

    if len(train_imgs) != EXPECTED_TRAIN_COUNT:
        raise ValueError(f"Expected {EXPECTED_TRAIN_COUNT} train images, found {len(train_imgs)}")
    if len(val_imgs) != EXPECTED_VAL_COUNT:
        raise ValueError(f"Expected {EXPECTED_VAL_COUNT} val images, found {len(val_imgs)}")
    if len(train_lbls) != EXPECTED_TRAIN_COUNT:
        raise ValueError(f"Expected {EXPECTED_TRAIN_COUNT} train labels, found {len(train_lbls)}")
    if len(val_lbls) != EXPECTED_VAL_COUNT:
        raise ValueError(f"Expected {EXPECTED_VAL_COUNT} val labels, found {len(val_lbls)}")

    # Verify 1:1 image-to-label correspondence
    train_img_stems = {p.stem for p in train_imgs}
    train_lbl_stems = {p.stem for p in train_lbls}
    val_img_stems = {p.stem for p in val_imgs}
    val_lbl_stems = {p.stem for p in val_lbls}

    if train_img_stems != train_lbl_stems:
        diff = train_img_stems ^ train_lbl_stems
        raise ValueError(f"Train image/label mismatch: {len(diff)} discrepancies found.")
    if val_img_stems != val_lbl_stems:
        diff = val_img_stems ^ val_lbl_stems
        raise ValueError(f"Val image/label mismatch: {len(diff)} discrepancies found.")

    for p in train_imgs:
        files_to_pack.append((p, f"rdd2022/images/train/{p.name}"))
    for p in train_lbls:
        files_to_pack.append((p, f"rdd2022/labels/train/{p.name}"))
    for p in val_imgs:
        files_to_pack.append((p, f"rdd2022/images/val/{p.name}"))
    for p in val_lbls:
        files_to_pack.append((p, f"rdd2022/labels/val/{p.name}"))

    # 2. Metadata files
    yaml_file = dataset_dir / "dataset.yaml"
    audit_file = dataset_dir / "dataset_audit.json"

    if not yaml_file.is_file():
        raise FileNotFoundError(f"dataset.yaml not found: {yaml_file}")
    if not audit_file.is_file():
        raise FileNotFoundError(f"dataset_audit.json not found: {audit_file}")

    files_to_pack.append((yaml_file, "rdd2022/dataset.yaml"))
    files_to_pack.append((audit_file, "rdd2022/dataset_audit.json"))

    return files_to_pack


def create_dataset_bundle(dataset_dir: Path, output_zip: Path) -> dict:
    """Pack the clean portable dataset archive and verify its integrity."""
    output_zip.parent.mkdir(parents=True, exist_ok=True)
    if output_zip.exists():
        output_zip.unlink()

    files_to_pack = collect_bundle_files(dataset_dir)
    print(f"Collected {len(files_to_pack)} clean files for bundle (target: {output_zip.name})...")

    start_time = time.time()
    # Use ZIP_DEFLATED with compression level 6 for fast, compact archive
    with zipfile.ZipFile(output_zip, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=6) as z:
        for idx, (file_path, arcname) in enumerate(files_to_pack, 1):
            z.write(file_path, arcname=arcname)
            if idx % 3000 == 0 or idx == len(files_to_pack):
                pct = (idx / len(files_to_pack)) * 100
                print(f"  Packed {idx}/{len(files_to_pack)} files ({pct:.1f}%)...")

    duration = time.time() - start_time
    zip_size_bytes = output_zip.stat().st_size
    zip_size_mb = zip_size_bytes / (1024 * 1024)
    print(f"Archive created in {duration:.1f}s. Size: {zip_size_mb:.2f} MB ({zip_size_bytes} bytes)")

    # Integrity verification
    print("Verifying archive integrity via CRC32 testzip()...")
    with zipfile.ZipFile(output_zip, "r") as z:
        corrupted = z.testzip()
        if corrupted is not None:
            raise RuntimeError(f"Corrupt entry detected in zip archive: {corrupted}")
        namelist = z.namelist()
        if len(namelist) != EXPECTED_TOTAL_ENTRIES:
            raise ValueError(f"Expected {EXPECTED_TOTAL_ENTRIES} entries, found {len(namelist)}")

    # Extraction test in temporary directory
    print("Testing extraction to isolated temporary directory...")
    with tempfile.TemporaryDirectory() as tmp_dir:
        tmp_path = Path(tmp_dir)
        with zipfile.ZipFile(output_zip, "r") as z:
            # Extract metadata and sample files
            sample_entries = [
                "rdd2022/dataset.yaml",
                "rdd2022/dataset_audit.json",
                "rdd2022/images/train/India_000001.jpg",
                "rdd2022/labels/train/India_000001.txt",
            ]
            for entry in sample_entries:
                z.extract(entry, tmp_path)
                extracted_file = tmp_path / entry
                if not extracted_file.is_file():
                    raise RuntimeError(f"Failed extraction test for: {entry}")

        # Check extracted YAML syntax
        yaml_content = (tmp_path / "rdd2022" / "dataset.yaml").read_text()
        yaml_data = load_yaml_str(yaml_content)
        assert "names" in yaml_data, "dataset.yaml missing 'names' mapping"
        assert len(yaml_data["names"]) == 4, "dataset.yaml does not define 4 classes"

    # Compute SHA256 checksum
    print("Computing SHA256 checksum...")
    sha256_hash = hashlib.sha256()
    with open(output_zip, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            sha256_hash.update(chunk)
    sha256_hex = sha256_hash.hexdigest()

    result = {
        "archive_path": str(output_zip.resolve()),
        "archive_filename": output_zip.name,
        "size_bytes": zip_size_bytes,
        "size_mb": round(zip_size_mb, 2),
        "sha256": sha256_hex,
        "total_files": len(files_to_pack),
        "train_images": EXPECTED_TRAIN_COUNT,
        "val_images": EXPECTED_VAL_COUNT,
        "train_labels": EXPECTED_TRAIN_COUNT,
        "val_labels": EXPECTED_VAL_COUNT,
        "metadata_files": ["rdd2022/dataset.yaml", "rdd2022/dataset_audit.json"],
        "duration_seconds": round(duration, 2),
    }

    print("\n=== Dataset Bundle Created and Verified Successfully ===")
    print(f"Archive: {result['archive_path']}")
    print(f"Size:    {result['size_mb']} MB")
    print(f"SHA256:  {result['sha256']}")
    print(f"Files:   {result['total_files']} (6,161 train, 1,545 val, 1:1 paired labels)")
    return result


if __name__ == "__main__":
    repo_root = Path(__file__).resolve().parent.parent.parent
    dataset_directory = repo_root / "datasets" / "rdd2022"
    target_zip = repo_root / "datasets" / "rdd2022_yolo_trainval.zip"

    create_dataset_bundle(dataset_directory, target_zip)
