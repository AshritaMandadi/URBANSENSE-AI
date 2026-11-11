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
try:
    import torch
    TORCH_AVAILABLE = True
except ImportError:
    torch = None
    TORCH_AVAILABLE = False

from ai_engine.detection.detector import BaseDetector, Detection
from ai_engine.detection.model_provisioner import (
    get_models_dir,
    inspect_model_readiness,
    resolve_road_damage_model_path,
)


# Standardized distress taxonomy based on RDD2022 India
ROAD_DAMAGE_CLASSES: Dict[int, str] = {
    0: "longitudinal_crack",  # D00
    1: "transverse_crack",    # D10
    2: "alligator_crack",     # D20
    3: "pothole",             # D40
}


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
        lazy_load: bool = True,
    ):
        self._model_path = resolve_road_damage_model_path(model_path)
        self._model_name = Path(self._model_path).name

        if device is not None:
            self._device = device
        elif TORCH_AVAILABLE and torch.backends.mps.is_available():
            self._device = "mps"
        else:
            self._device = "cpu"

        self._is_ready = False
        self._status = "NOT_READY" if TORCH_AVAILABLE else "LOCAL_ONLY"
        self._loading_error: Optional[str] = (
            None if TORCH_AVAILABLE else "Server-side PyTorch is disabled on Free tier (512 MB RAM limit). Video processing is LOCAL_ONLY on Apple Silicon Mac."
        )
        self._model = None

        if not TORCH_AVAILABLE:
            return

        # Lightweight inspection: verify model readiness without eager tensor allocation
        is_ready, status, size, err = inspect_model_readiness(self._model_path)
        self._is_ready = is_ready
        self._status = status
        self._loading_error = err

        if self._is_ready and not lazy_load:
            self._load_model()

    def _load_model(self) -> None:
        """Internal helper to load YOLO model weights into memory."""
        if self._model is not None:
            return
        if not TORCH_AVAILABLE:
            raise RuntimeError("Cannot load road damage model: PyTorch is not installed on this host.")
        if not self._is_ready:
            raise RuntimeError(f"Cannot load road damage model: {self._loading_error}")
        try:
            from ultralytics import YOLO
            self._model = YOLO(self._model_path)
            self._model.to(self._device)
            self._status = "READY"
            self._is_ready = True
            self._loading_error = None
        except Exception as err:
            self._is_ready = False
            self._status = "NOT_READY"
            self._loading_error = f"Error loading model from '{self._model_path}': {err}"
            raise

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

        if self._model is None:
            self._load_model()

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
