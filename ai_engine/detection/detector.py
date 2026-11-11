"""
UrbanSense AI - Object Detection Subsystem

Provides modular detector interfaces and implementations for road scene analysis.
General COCO object detection (vehicles, pedestrians, signs) is handled by
GeneralObjectDetector using pretrained YOLO11n. Future domain-specific detection
(e.g., potholes, road cracks, construction zones) will inherit from BaseDetector.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass
import os
from pathlib import Path
import sys
from typing import List, Optional, Sequence

# Ensure Ultralytics uses a writable configuration directory in all environments
if "YOLO_CONFIG_DIR" not in os.environ:
    os.environ["YOLO_CONFIG_DIR"] = "/tmp"

try:
    import numpy as np
except ImportError:
    np = None

try:
    import torch
    from ultralytics import YOLO
    TORCH_AVAILABLE = True
except ImportError:
    torch = None
    YOLO = None
    TORCH_AVAILABLE = False


@dataclass(frozen=True)
class Detection:
    """Represents a single detected object in a frame."""
    class_id: int
    class_name: str
    confidence: float
    bbox: tuple[int, int, int, int]  # (x1, y1, x2, y2) in pixel coordinates
    frame_number: Optional[int] = None
    timestamp: Optional[float] = None


class BaseDetector(ABC):
    """Abstract base class defining the detection contract for UrbanSense AI."""

    @property
    @abstractmethod
    def device(self) -> str:
        """Return the compute device (e.g., 'mps', 'cpu')."""
        pass

    @property
    @abstractmethod
    def model_name(self) -> str:
        """Return the model identifier or weights filename."""
        pass

    @abstractmethod
    def predict(
        self,
        frame: np.ndarray,
        conf_threshold: float = 0.25,
        target_classes: Optional[Sequence[int]] = None,
        frame_number: Optional[int] = None,
        timestamp: Optional[float] = None,
    ) -> list[Detection]:
        """
        Run inference on a single BGR image frame.

        Args:
            frame: BGR numpy ndarray (H, W, 3).
            conf_threshold: Minimum confidence score [0.0, 1.0].
            target_classes: Optional list of class IDs to filter.

        Returns:
            List of Detection objects.
        """
        pass


def resolve_model_path(model_path: Optional[str] = None, default_name: str = "yolo11n.pt") -> str:
    """
    Resolve model path across standard repository locations.
    """
    if model_path and Path(model_path).is_file():
        return str(Path(model_path).resolve())

    # Candidate locations relative to repository
    script_dir = Path(__file__).resolve().parent
    repo_root = script_dir.parent.parent
    candidates = [
        Path(model_path) if model_path else None,
        script_dir.parent / "models" / default_name,
        repo_root / "ai_engine" / "models" / default_name,
        repo_root / default_name,
        Path.cwd() / default_name,
    ]

    for candidate in candidates:
        if candidate and candidate.is_file():
            return str(candidate.resolve())

    # Fall back to default string if not found locally
    return model_path or default_name


class GeneralObjectDetector(BaseDetector):
    """
    General road scene object detector utilizing pretrained YOLO11n weights (COCO 80 classes).
    
    Used to detect common urban context elements:
    vehicles (cars, buses, trucks, motorcycles, bicycles),
    pedestrians, traffic lights, and street signs.

    Pothole and road-damage detection are specialized tasks that will be handled
    by dedicated fine-tuned models implementing BaseDetector in subsequent milestones.
    """

    def __init__(
        self,
        model_path: Optional[str] = None,
        device: Optional[str] = None,
        lazy_load: bool = True,
    ):
        """
        Initialize GeneralObjectDetector.

        Args:
            model_path: Optional path to YOLO weights file. Defaults to 'yolo11n.pt'.
            device: Optional device override ('mps', 'cpu', 'cuda'). Defaults to auto-detect MPS/CPU.
            lazy_load: Whether to defer weights loading until first inference call.
        """
        from ai_engine.detection.model_provisioner import inspect_model_readiness, resolve_general_model_path

        resolved_path = resolve_general_model_path(model_path, default_name="yolo11n.pt")
        self._model_path = resolved_path
        self._model_name = Path(resolved_path).name

        # Select Apple MPS when available, otherwise CPU
        if device is not None:
            self._device = device
        elif TORCH_AVAILABLE and torch.backends.mps.is_available():
            self._device = "mps"
        else:
            self._device = "cpu"

        self._is_ready = False
        self._status = "NOT_READY" if TORCH_AVAILABLE else "NOT_AVAILABLE"
        self._loading_error: Optional[str] = (
            None if TORCH_AVAILABLE else "PyTorch/Ultralytics is not installed on this cloud instance (Free Tier)."
        )
        self._model = None

        if not TORCH_AVAILABLE:
            return

        # Lightweight readiness inspection
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
            raise RuntimeError("Cannot load model: PyTorch/Ultralytics is not installed on this host.")
        from ultralytics import YOLO
        try:
            self._model = YOLO(self._model_path)
            self._model.to(self._device)
            self._is_ready = True
            self._status = "READY"
            self._loading_error = None
        except Exception as err:
            self._is_ready = False
            self._status = "NOT_READY"
            self._loading_error = f"Error loading general model '{self._model_path}': {err}"
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

    def predict(
        self,
        frame: np.ndarray,
        conf_threshold: float = 0.25,
        target_classes: Optional[Sequence[int]] = None,
        frame_number: Optional[int] = None,
        timestamp: Optional[float] = None,
    ) -> List[Detection]:
        """
        Run YOLO11n inference on a single frame in inference mode.

        Args:
            frame: Single video frame as a BGR numpy array.
            conf_threshold: Confidence cutoff threshold.
            target_classes: Optional list of class IDs to filter.
            frame_number: Optional frame index within video.
            timestamp: Optional timestamp in seconds within video.

        Returns:
            List of Detection objects.
        """
        if self._model is None:
            self._load_model()
        if frame is None or not isinstance(frame, np.ndarray) or frame.size == 0:
            raise ValueError("Input frame must be a valid non-empty numpy array.")

        if frame.ndim != 3 or frame.shape[2] != 3:
            raise ValueError(f"Expected BGR frame with shape (H, W, 3), got shape {frame.shape}")

        # Run inference using PyTorch inference mode for optimal memory and compute
        with torch.inference_mode():
            results = self._model(
                source=frame,
                conf=conf_threshold,
                classes=list(target_classes) if target_classes is not None else None,
                device=self._device,
                verbose=False,
            )

        detections: list[Detection] = []
        if not results or len(results) == 0:
            return detections

        result = results[0]
        boxes = result.boxes
        if boxes is None or len(boxes) == 0:
            return detections

        coords = boxes.xyxy.cpu().numpy()
        confs = boxes.conf.cpu().numpy()
        clss = boxes.cls.cpu().numpy()
        names = result.names or {}

        for i in range(len(coords)):
            x1, y1, x2, y2 = coords[i]
            conf = float(confs[i])
            class_id = int(clss[i])
            class_name = names.get(class_id, f"class_{class_id}")

            detections.append(
                Detection(
                    class_id=class_id,
                    class_name=str(class_name),
                    confidence=round(conf, 4),
                    bbox=(int(round(x1)), int(round(y1)), int(round(x2)), int(round(y2))),
                    frame_number=frame_number,
                    timestamp=timestamp,
                )
            )

        return detections

