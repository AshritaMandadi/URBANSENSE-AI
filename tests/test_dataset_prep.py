"""
UrbanSense AI - Dataset Preparation Unit Tests

Tests Pascal VOC parsing, YOLO coordinate normalization, boundary clamping,
unsupported class filtering, sequence-aware train/val splitting, and YAML/JSON generation.
"""

import json
import os
from pathlib import Path
import tempfile
import unittest
import xml.etree.ElementTree as ET

try:
    import yaml
    def load_yaml(path: Path) -> dict:
        with open(path) as f:
            return yaml.safe_load(f)
except ImportError:
    os.environ.setdefault("YOLO_CONFIG_DIR", "/tmp")
    from ultralytics.utils import YAML
    def load_yaml(path: Path) -> dict:
        return YAML.load(path)

from ai_engine.data_prep.rdd_converter import (
    CLASS_MAPPING,
    CLASS_NAMES,
    convert_rdd2022_india,
    parse_voc_xml,
    split_sequence_blocks,
)


class TestDatasetPrep(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.base_path = Path(self.temp_dir.name)

    def tearDown(self):
        self.temp_dir.cleanup()

    def _create_sample_xml(
        self,
        filename: str,
        width: int = 1000,
        height: int = 800,
        objects: list = None,
    ) -> Path:
        """Helper to create a synthetic Pascal VOC XML file."""
        root = ET.Element("annotation")
        size = ET.SubElement(root, "size")
        ET.SubElement(size, "width").text = str(width)
        ET.SubElement(size, "height").text = str(height)
        ET.SubElement(size, "depth").text = "3"

        if objects:
            for obj_data in objects:
                obj = ET.SubElement(root, "object")
                ET.SubElement(obj, "name").text = obj_data["name"]
                bndbox = ET.SubElement(obj, "bndbox")
                ET.SubElement(bndbox, "xmin").text = str(obj_data["xmin"])
                ET.SubElement(bndbox, "ymin").text = str(obj_data["ymin"])
                ET.SubElement(bndbox, "xmax").text = str(obj_data["xmax"])
                ET.SubElement(bndbox, "ymax").text = str(obj_data["ymax"])

        xml_path = self.base_path / filename
        tree = ET.ElementTree(root)
        tree.write(xml_path)
        return xml_path

    def test_parse_voc_xml_valid_all_classes(self):
        """Test parsing valid XML containing all 4 target distress classes."""
        objects = [
            {"name": "D00", "xmin": 100, "ymin": 200, "xmax": 300, "ymax": 400},
            {"name": "D10", "xmin": 400, "ymin": 500, "xmax": 600, "ymax": 700},
            {"name": "D20", "xmin": 50, "ymin": 50, "xmax": 150, "ymax": 150},
            {"name": "D40", "xmin": 700, "ymin": 100, "xmax": 850, "ymax": 300},
        ]
        xml_path = self._create_sample_xml("valid_all.xml", width=1000, height=800, objects=objects)

        yolo_lines, class_counts, invalid_boxes = parse_voc_xml(xml_path)

        self.assertEqual(len(yolo_lines), 4)
        self.assertEqual(invalid_boxes, 0)
        self.assertEqual(class_counts["D00"], 1)
        self.assertEqual(class_counts["D10"], 1)
        self.assertEqual(class_counts["D20"], 1)
        self.assertEqual(class_counts["D40"], 1)

        # Verify class 0 (D00: xmin=100, ymin=200, xmax=300, ymax=400, img: 1000x800)
        # x_center = 200/1000 = 0.2, y_center = 300/800 = 0.375, w = 200/1000 = 0.2, h = 200/800 = 0.25
        self.assertIn("0 0.200000 0.375000 0.200000 0.250000", yolo_lines[0])

        # Verify class 3 (D40: xmin=700, ymin=100, xmax=850, ymax=300)
        # x_center = 775/1000 = 0.775, y_center = 200/800 = 0.25, w = 150/1000 = 0.15, h = 200/800 = 0.25
        self.assertIn("3 0.775000 0.250000 0.150000 0.250000", yolo_lines[3])

    def test_parse_voc_xml_boundary_clamping(self):
        """Test that out-of-boundary bounding boxes are clamped to image edges."""
        objects = [
            {"name": "D40", "xmin": -50, "ymin": -20, "xmax": 1200, "ymax": 900},
        ]
        xml_path = self._create_sample_xml("clamping.xml", width=1000, height=800, objects=objects)

        yolo_lines, class_counts, invalid_boxes = parse_voc_xml(xml_path)

        self.assertEqual(len(yolo_lines), 1)
        self.assertEqual(invalid_boxes, 0)
        # Clamped to [0, 0, 1000, 800] -> center = (0.5, 0.5), w = 1.0, h = 1.0
        self.assertEqual(yolo_lines[0], "3 0.500000 0.500000 1.000000 1.000000")

    def test_parse_voc_xml_discard_invalid_boxes(self):
        """Test that degenerate boxes with <=1px width/height are discarded."""
        objects = [
            {"name": "D00", "xmin": 100, "ymin": 100, "xmax": 101, "ymax": 200},  # box_w = 1.0 -> discard
            {"name": "D10", "xmin": 200, "ymin": 200, "xmax": 200, "ymax": 200},  # box_w=0, box_h=0 -> discard
            {"name": "D40", "xmin": 100, "ymin": 100, "xmax": 200, "ymax": 200},  # valid
        ]
        xml_path = self._create_sample_xml("degenerate.xml", width=1000, height=800, objects=objects)

        yolo_lines, class_counts, invalid_boxes = parse_voc_xml(xml_path)

        self.assertEqual(len(yolo_lines), 1)
        self.assertEqual(invalid_boxes, 2)
        self.assertEqual(yolo_lines[0].split()[0], "3")  # D40 pothole kept

    def test_unsupported_classes_ignored(self):
        """Test that non-target classes (e.g. D30, Repair) are tracked but excluded from YOLO lines."""
        objects = [
            {"name": "D30", "xmin": 100, "ymin": 100, "xmax": 200, "ymax": 200},
            {"name": "Repair", "xmin": 300, "ymin": 300, "xmax": 400, "ymax": 400},
            {"name": "D40", "xmin": 500, "ymin": 500, "xmax": 600, "ymax": 600},
        ]
        xml_path = self._create_sample_xml("unsupported.xml", width=1000, height=800, objects=objects)

        yolo_lines, class_counts, invalid_boxes = parse_voc_xml(xml_path)

        self.assertEqual(len(yolo_lines), 1)
        self.assertIn("D30", class_counts)
        self.assertIn("Repair", class_counts)
        self.assertEqual(class_counts["D40"], 1)
        self.assertEqual(yolo_lines[0].split()[0], "3")

    def test_sequence_block_splitting_leakage_free(self):
        """Test that split_sequence_blocks keeps frame blocks contiguous and disjoint."""
        # 100 consecutive frames: India_000001 to India_000100
        image_names = [f"India_{i:06d}" for i in range(1, 101)]
        train_names, val_names = split_sequence_blocks(image_names, val_ratio=0.2, block_size=10, seed=42)

        # Disjoint sets
        intersection = set(train_names).intersection(set(val_names))
        self.assertEqual(len(intersection), 0)

        # Union covers all images
        self.assertEqual(set(train_names).union(set(val_names)), set(image_names))

        # Train and val counts adhere approximately to 80/20 ratio
        self.assertEqual(len(val_names), 20)
        self.assertEqual(len(train_names), 80)

        # Check block integrity: any 10-frame sequence (e.g. India_000001 - India_000010)
        # must be entirely in train or entirely in val, never split
        for i in range(1, 101, 10):
            block = [f"India_{j:06d}" for j in range(i, i + 10)]
            in_train = set(block).issubset(set(train_names))
            in_val = set(block).issubset(set(val_names))
            self.assertTrue(in_train or in_val, f"Block {block} was split across train and val!")

    def test_full_synthetic_conversion_pipeline(self):
        """Test end-to-end dataset conversion with synthetic files."""
        raw_india = self.base_path / "India"
        train_img_dir = raw_india / "train" / "images"
        train_xml_dir = raw_india / "train" / "annotations" / "xmls"
        test_img_dir = raw_india / "test" / "images"

        train_img_dir.mkdir(parents=True)
        train_xml_dir.mkdir(parents=True)
        test_img_dir.mkdir(parents=True)

        # Create 10 dummy images and XMLs
        for i in range(1, 11):
            stem = f"India_{i:06d}"
            # Create a 100x100 dummy image file
            (train_img_dir / f"{stem}.jpg").write_bytes(b"\xff\xd8\xff\xe0" + b"\x00" * 100)

            # Create an XML for the first 8, leaving 2 as background images without XML
            if i <= 8:
                obj = [{"name": "D40" if i % 2 == 0 else "D00", "xmin": 10, "ymin": 10, "xmax": 50, "ymax": 50}]
                root = ET.Element("annotation")
                size = ET.SubElement(root, "size")
                ET.SubElement(size, "width").text = "100"
                ET.SubElement(size, "height").text = "100"
                for o in obj:
                    elem = ET.SubElement(root, "object")
                    ET.SubElement(elem, "name").text = o["name"]
                    bnd = ET.SubElement(elem, "bndbox")
                    ET.SubElement(bnd, "xmin").text = str(o["xmin"])
                    ET.SubElement(bnd, "ymin").text = str(o["ymin"])
                    ET.SubElement(bnd, "xmax").text = str(o["xmax"])
                    ET.SubElement(bnd, "ymax").text = str(o["ymax"])
                ET.ElementTree(root).write(train_xml_dir / f"{stem}.xml")

        # Create 2 dummy test images
        for i in range(1, 3):
            (test_img_dir / f"India_test_{i:04d}.jpg").write_bytes(b"\xff\xd8\xff\xe0" + b"\x00" * 50)

        out_dir = self.base_path / "output_dataset"
        audit = convert_rdd2022_india(raw_india, out_dir, val_ratio=0.2, seed=42)

        # Check directory structure
        self.assertTrue((out_dir / "images" / "train").is_dir())
        self.assertTrue((out_dir / "images" / "val").is_dir())
        self.assertTrue((out_dir / "labels" / "train").is_dir())
        self.assertTrue((out_dir / "labels" / "val").is_dir())

        # Check dataset.yaml
        yaml_path = out_dir / "dataset.yaml"
        self.assertTrue(yaml_path.is_file())
        yaml_data = load_yaml(yaml_path)
        self.assertEqual(yaml_data["train"], "images/train")
        self.assertEqual(yaml_data["val"], "images/val")
        self.assertEqual(len(yaml_data["names"]), 4)
        self.assertEqual(yaml_data["names"][0], "longitudinal_crack")
        self.assertEqual(yaml_data["names"][3], "pothole")

        # Check dataset_audit.json
        audit_path = out_dir / "dataset_audit.json"
        self.assertTrue(audit_path.is_file())
        with open(audit_path) as f:
            audit_json = json.load(f)
        self.assertEqual(audit_json["raw_counts"]["training_images"], 10)
        self.assertEqual(audit_json["raw_counts"]["training_xmls"], 8)
        self.assertEqual(audit_json["raw_counts"]["missing_xml_annotations"], 2)
        self.assertEqual(audit_json["conversion_summary"]["clean_background_images"], 2)
        self.assertEqual(audit_json["conversion_summary"]["images_with_defects"], 8)

    def test_portable_dataset_yaml_specification(self):
        """Verify datasets/rdd2022/dataset.yaml uses portable paths without hardcoded local roots."""
        repo_root = Path(__file__).resolve().parent.parent
        yaml_path = repo_root / "datasets" / "rdd2022" / "dataset.yaml"
        self.assertTrue(yaml_path.is_file(), f"dataset.yaml not found at {yaml_path}")

        yaml_data = load_yaml(yaml_path)
        self.assertIn("path", yaml_data)
        # Verify it does NOT contain a hardcoded Mac absolute home directory
        self.assertFalse(
            yaml_data["path"].startswith("/Users/"),
            f"dataset.yaml contains hardcoded user path: {yaml_data['path']}",
        )
        self.assertEqual(yaml_data["train"], "images/train")
        self.assertEqual(yaml_data["val"], "images/val")
        self.assertEqual(len(yaml_data["names"]), 4)

    def test_cloud_training_notebooks_exist_and_valid(self):
        """Verify Kaggle and Colab training notebooks are valid JSON with required cells."""
        repo_root = Path(__file__).resolve().parent.parent
        kaggle_nb = repo_root / "training" / "UrbanSense_RDD2022_Kaggle.ipynb"
        colab_nb = repo_root / "training" / "UrbanSense_RDD2022_Colab.ipynb"

        for nb_path in (kaggle_nb, colab_nb):
            self.assertTrue(nb_path.is_file(), f"Notebook not found: {nb_path}")
            with open(nb_path) as f:
                nb = json.load(f)
            self.assertEqual(nb["nbformat"], 4)
            self.assertGreaterEqual(len(nb["cells"]), 10)

            # Search cell contents for critical guards and instructions
            all_source = "".join(
                "".join(c.get("source", [])) for c in nb["cells"]
            )
            self.assertIn("degrees=0.0", all_source, f"Orientation guard missing in {nb_path.name}")
            self.assertIn("flipud=0.0", all_source, f"Vertical flip guard missing in {nb_path.name}")
            self.assertIn("road_damage_yolo11n.pt", all_source, f"Target model name missing in {nb_path.name}")
            self.assertIn("resume=True", all_source, f"Resume capability missing in {nb_path.name}")

    def test_training_script_parser_and_portability(self):
        """Verify train_road_damage CLI parser and runtime YAML preparation."""
        from training.train_road_damage import build_parser, prepare_dataset_yaml

        parser = build_parser()
        args = parser.parse_args(["--dry-run", "--batch", "8", "--seed", "42"])
        self.assertTrue(args.dry_run)
        self.assertEqual(args.batch, 8)
        self.assertEqual(args.seed, 42)

        # Test runtime YAML generation with a temporary dataset directory
        temp_dataset = self.base_path / "temp_rdd"
        (temp_dataset / "images" / "train").mkdir(parents=True)
        runtime_yaml = prepare_dataset_yaml("non_existent.yaml", dataset_root_override=str(temp_dataset))
        self.assertTrue(runtime_yaml.is_file())
        loaded = load_yaml(runtime_yaml)
        self.assertEqual(loaded["path"], str(temp_dataset.resolve()))

    def test_dataset_bundle_integrity_and_exclusion(self):
        """Verify rdd2022_yolo_trainval.zip contains exactly 15,414 clean files and excludes raw files."""
        import zipfile

        repo_root = Path(__file__).resolve().parent.parent
        bundle_path = repo_root / "datasets" / "rdd2022_yolo_trainval.zip"
        self.assertTrue(bundle_path.is_file(), f"Bundle not found: {bundle_path}")

        with zipfile.ZipFile(bundle_path, "r") as z:
            self.assertIsNone(z.testzip(), "Corrupt file in bundle archive")
            namelist = z.namelist()
            self.assertEqual(len(namelist), 15414)

            # Exclusions check
            for name in namelist:
                self.assertFalse(
                    "raw/" in name or "RDD2022_India.zip" in name,
                    f"Forbidden raw file found in bundle: {name}",
                )
                self.assertFalse(
                    name.endswith(".xml"),
                    f"Raw VOC XML found in bundle: {name}",
                )

            # Inclusions check
            self.assertIn("rdd2022/dataset.yaml", namelist)
            self.assertIn("rdd2022/dataset_audit.json", namelist)


if __name__ == "__main__":
    unittest.main()
