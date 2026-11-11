# UrbanSense AI - RDD2022 India Dataset Notes & Specification

## 1. Official Dataset Overview & Provenance

The Road Damage Dataset 2022 (RDD2022) is the benchmark dataset released through the **Crowdsensing-based Road Damage Detection Challenge 2022 (CRDDC2022)** at the IEEE International Conference on Big Data (IEEE BigData 2022).

- **Official Repository**: [sekilab/RoadDamageDetector](https://github.com/sekilab/RoadDamageDetector)
- **Primary Host**: Figshare Repository
- **DOI**: [10.6084/m9.figshare.21431547](https://doi.org/10.6084/m9.figshare.21431547)
- **Official Archive File**: `RDD2022_released_through_CRDDC2022.zip` (Zip64 flat container, 13,264,172,619 bytes)
- **India Subset Container**: `RDD2022/India.zip` (526,709,145 bytes / 502.3 MB)
- **Byte Range in Archive**: Bytes `609,341,079` to `1,136,050,223` (extracted via HTTP Range request without downloading non-target country archives)

### Paper Citations
```bibtex
@article{arya2022rdd2022,
  title={Global Road Damage Detection: State-of-the-Art Solutions},
  author={Arya, Deeksha and Maeda, Hiroya and Ghosh, Sanjay Kumar and Toshniwal, Durga and Sekimoto, Yoshihide},
  journal={arXiv preprint arXiv:2211.01256},
  year={2022}
}

@article{maeda2018road,
  title={Road damage detection and classification using deep neural networks with smartphone images},
  author={Maeda, Hiroya and Sekimoto, Yoshihide and Seto, Toshikazu and Kashiyama, Takehiro and Omata, Hiroshi},
  journal={Computer-Aided Civil and Infrastructure Engineering},
  volume={33},
  number={12},
  pages={1127--1141},
  year={2018}
}
```

---

## 2. Licensing Discrepancy & Usage Rights

There is a documented discrepancy between the dataset repository metadata and the competition guidelines:

1. **Figshare Catalog Metadata**:
   - License: **Creative Commons Attribution 4.0 International (CC BY 4.0)**
   - Allows sharing and adapting for any purpose (commercial and non-commercial), provided appropriate credit is given and license changes are documented.
2. **CRDDC2022 Competition Rules**:
   - License: **Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)**
   - Requires adaptations and derived models or datasets to be shared under the same license terms.

### UrbanSense AI Compliance Strategy
- Both CC BY 4.0 and CC BY-SA 4.0 explicitly authorize modification, adaptation, and model training.
- UrbanSense AI adheres to the stricter **CC BY-SA 4.0** standard for any redistributed derived annotations or model artifacts.
- Full provenance attribution to Sekilab and the original authors is maintained across all training pipelines and configuration files.

---

## 3. Class Taxonomy & Mapping (Strict 4-Class Specification)

The CRDDC2022 challenge annotates road distress following the Japanese road maintenance standard. UrbanSense AI adopts the strict 4-class taxonomy required for operational municipal road monitoring:

| Class ID | Code | Class Name | Description | Severity / Nature |
|---|---|---|---|---|
| **0** | **D00** | `longitudinal_crack` | Wheel path / longitudinal surface fracture | Structural fatigue along travel direction |
| **1** | **D10** | `transverse_crack` | Perpendicular cross-road crack | Thermal contraction / reflective cracking |
| **2** | **D20** | `alligator_crack` | Interconnected fatigue mesh cracking | Advanced base failure requiring patch/mill |
| **3** | **D40** | `pothole` | Bowl-shaped road surface cavity | High-hazard structural void |

### Non-Target / Unsupported Annotations
In some subsets of RDD, auxiliary categories such as `D30` (rutting/bump/corrugation) or `Repair` (patches) may be encountered in raw XML files:
- UrbanSense AI's converter explicitly filters these out.
- They are **not** remapped to potholes or cracks to prevent label corruption.
- Audit statistics record instances of filtered classes.

---

## 4. Dataset Partitioning & Anti-Leakage Strategy

RDD2022 data is captured from vehicle-mounted smartphones driving along road corridors. Consecutive images exhibit significant visual overlap and spatial auto-correlation:

- **The Leakage Risk**: Naive random splitting causes frames $t$ and $t+1$ to be partitioned into train and validation sets, artificially inflating validation mAP while yielding poor generalization on unseen routes.
- **UrbanSense AI Block-Based Splitting**:
  - Images are lexicographically sorted by route sequence number (e.g., `India_000001.jpg` ... `India_007706.jpg`).
  - Frames are grouped into contiguous blocks (default block size = 15 consecutive frames).
  - Whole blocks are randomly assigned to either the training set (80%) or validation set (20%) using a deterministic seed (`seed=42`).
  - This eliminates spatial-temporal leakage while maintaining balanced class representation.

---

## 5. Directory Structure & YOLO Format

### Output Structure
```
datasets/rdd2022/
├── dataset.yaml                # Ultralytics YOLO configuration file
├── dataset_audit.json          # Complete audit log with precise counts
├── images/
│   ├── train/                  # Training images (.jpg)
│   └── val/                    # Validation images (.jpg)
├── labels/
│   ├── train/                  # YOLO TXT annotations
│   └── val/                    # YOLO TXT annotations
└── raw/
    ├── RDD2022_India.zip       # Raw archive (502.3 MB)
    └── India/
        ├── train/
        │   ├── images/         # 7,706 raw training images
        │   └── annotations/    # 7,706 Pascal VOC XML files
        └── test/
            └── images/         # 1,959 unlabeled challenge test images
```

### YOLO TXT Format
Normalized bounding box coordinates relative to image width and height:
```
<class_id> <x_center> <y_center> <width> <height>
```
Values are clamped strictly in the range $[0.0, 1.0]$. Empty label files are retained for clean background images (no defects) to teach the model negative background contexts.

