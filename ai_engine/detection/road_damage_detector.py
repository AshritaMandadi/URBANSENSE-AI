"""
UrbanSense AI - Specialized Road Damage Detection Architecture

Implements RoadDamageDetector compatible with BaseDetector.
Decoupled from general COCO object detection. Designed to load trained
asphalt distress weights once available without rewriting the video pipeline.
"""

import os
from pathlib import Path
from typing import Dict, List, Optional, Sequence

import numpy as np
import torch

from ai_engine.detection.detector import BaseDetector, Detection


# Standardized distress taxonomy based on RDD2022 India
ROAD_DAMAGE_CLASSES: Dict[int, str] = {
    0: "longitudinal_crack",  # D00
    1: "transverse_crack",    # D10
    2: "alligator_crack",     # D20
    3: "pothole",             # D40
}


def resolve_road_damage_model_path(model_path: Optional[str] = None) -> str:
    """
    Resolve the custom road damage model weights path.

    Priority:
      1. ROAD_DAMAGE_MODEL_PATH environment variable
      2. Explicitly passed `model_path` argument
      3. Default location: models/road_damage/best.pt
      4. Alternative location: ai_engine/models/road_damage_yolo11n.pt
    """
    repo_root = Path(__file__).resolve().parent.parent.parent

    env_path = os.environ.get("ROAD_DAMAGE_MODEL_PATH")
    if env_path:
        p = Path(env_path)
        return str(p.resolve()) if p.is_absolute() else str((repo_root / p).resolve())

    if model_path:
        p = Path(model_path)
        return str(p.resolve()) if p.is_absolute() else str((repo_root / p).resolve())

    candidates = [
        repo_root / "models" / "road_damage" / "best.pt",
        Path.cwd() / "models" / "road_damage" / "best.pt",
        repo_root / "ai_engine" / "models" / "road_damage_yolo11n.pt",
        Path.cwd() / "ai_engine" / "models" / "road_damage_yolo11n.pt",
    ]

    for candidate in candidates:
        if candidate and candidate.is_file():
            return str(candidate.resolve())

    return str((repo_root / "models" / "road_damage" / "best.pt").resolve())


class RoadDamageDetector(BaseDetector):
    """
    Dedicated road damage detector for pavement distresses.

    Target Classes:
      0: longitudinal_crack (D00)
      1: transverse_crack (D10)
      2: alligator_crack (D20)
      3: pothole (D40)

    If trained weights are not present on disk, gracefully reports
    status as NOT_READY via `status` and `is_model_ready` and refuses
    to fabricate fake detections.
    """

    def __init__(
        self,
        model_path: Optional[str] = None,
        device: Optional[str] = None,
    ):
        self._model_path = resolve_road_damage_model_path(model_path)
        self._model_name = Path(self._model_path).name

        self._device = device or ("mps" if torch.backends.mps.is_available() else "cpu")
        self._is_ready = False
        self._status = "NOT_READY"
        self._loading_error: Optional[str] = None
        self._model = None

        # Check if actual trained weights exist on disk
        if Path(self._model_path).is_file():
            try:
                from ultralytics import YOLO
                self._model = YOLO(self._model_path)
                self._model.to(self._device)
                self._is_ready = True
                self._status = "READY"
                self._loading_error = None
            except Exception as err:
                self._is_ready = False
                self._status = "NOT_READY"
                self._loading_error = f"Error loading model from '{self._model_path}': {err}"
        else:
            self._loading_error = (
                f"Trained road damage weights file '{self._model_path}' not found. "
                "Specialized road damage detector is in NOT_READY state. "
                "Copy Colab trained weights to 'models/road_damage/best.pt'."
            )

    @property
    def is_model_ready(self) -> bool:
        """Returns True if genuine trained weights are loaded and ready."""
        return self._is_ready

    @property
    def status(self) -> str:
        """Return readiness status: 'READY' or 'NOT_READY'."""
        return self._status

    @property
    def loading_error(self) -> Optional[str]:
        """Return loading error or missing weights explanation."""
        return self._loading_error

    @property
    def device(self) -> str:
        return self._device

    @property
    def model_name(self) -> str:
        return self._model_name

    @property
    def model_path(self) -> str:
        return self._model_path

    @property
    def target_classes(self) -> Dict[int, str]:
        return dict(ROAD_DAMAGE_CLASSES)

    @property
    def supported_classes(self) -> Dict[int, str]:
        return dict(ROAD_DAMAGE_CLASSES)

    def get_status(self) -> dict:
        """Return diagnostic status of the road damage detector."""
        return {
            "model_name": self._model_name,
            "model_path": self._model_path,
            "device": self._device,
            "status": self._status,
            "is_ready": self._is_ready,
            "loading_error": self._loading_error,
            "supported_classes": ROAD_DAMAGE_CLASSES,
            "target_classes": ROAD_DAMAGE_CLASSES,
            "message": "Model loaded and active" if self._is_ready else self._loading_error,
        }

    def predict(
        self,
        frame: np.ndarray,
        conf_threshold: float = 0.25,
        target_classes: Optional[Sequence[int]] = None,
        frame_number: Optional[int] = None,
        timestamp: Optional[float] = None,
    ) -> List[Detection]:
        """
        Run inference on frame. Raises RuntimeError if weights are not ready
        to ensure synthetic or fake detections are never produced.
        """
        if not self._is_ready:
            raise RuntimeError(
                f"RoadDamageDetector cannot predict: model is NOT_READY. {self._loading_error}"
            )

        if frame is None or not isinstance(frame, np.ndarray) or frame.size == 0:
            raise ValueError("Input frame must be a valid non-empty numpy array.")

        with torch.inference_mode():
            results = self._model(
                source=frame,
                conf=conf_threshold,
                classes=list(target_classes) if target_classes is not None else None,
                device=self._device,
                verbose=False,
            )

        detections: List[Detection] = []
        if not results or len(results) == 0:
            return detections

        result = results[0]
        boxes = result.boxes
        if boxes is None or len(boxes) == 0:
            return detections

        coords = boxes.xyxy.cpu().numpy()
        confs = boxes.conf.cpu().numpy()
        clss = boxes.cls.cpu().numpy()

        for i in range(len(coords)):
            x1, y1, x2, y2 = coords[i]
            conf = float(confs[i])
            class_id = int(clss[i])
            class_name = ROAD_DAMAGE_CLASSES.get(class_id, f"damage_class_{class_id}")

            detections.append(
                Detection(
                    class_id=class_id,
                    class_name=class_name,
                    confidence=round(conf, 4),
                    bbox=(int(round(x1)), int(round(y1)), int(round(x2)), int(round(y2))),
                    frame_number=frame_number,
                    timestamp=timestamp,
                )
            )

        return detections
