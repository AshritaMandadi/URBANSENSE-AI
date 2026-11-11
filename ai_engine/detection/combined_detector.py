"""
UrbanSense AI - Combined Road Damage & Scene Intelligence Detector

Executes dual inference:
1. Custom RDD2022 YOLO11n model for 4 road damage classes (pothole, alligator_crack, longitudinal_crack, transverse_crack)
2. Pretrained YOLO11n COCO model for traffic and pedestrian objects (car, truck, bus, motorcycle, bicycle, person)
"""

from typing import List, Optional, Sequence
import numpy as np

from ai_engine.detection.detector import BaseDetector, Detection, GeneralObjectDetector
from ai_engine.detection.road_damage_detector import RoadDamageDetector


class CombinedDetector(BaseDetector):
    """
    Combined Edge Intelligence detector.
    Executes custom RDD2022 road damage detection (potholes, cracks)
    AND general scene object detection (vehicles, pedestrians).
    """

    def __init__(
        self,
        rdd_model_path: Optional[str] = None,
        coco_model_path: Optional[str] = None,
        device: Optional[str] = None,
    ):
        self.rdd = RoadDamageDetector(rdd_model_path, device=device)
        self.coco = GeneralObjectDetector(coco_model_path, device=device)
        self._device = self.rdd.device
        self._model_name = "YOLO11n-RDD2022+COCO"

    @property
    def device(self) -> str:
        return self._device

    @property
    def model_name(self) -> str:
        return self._model_name

    @property
    def is_model_ready(self) -> bool:
        """Returns True if at least one underlying model is ready."""
        return self.rdd.is_model_ready or self.coco.is_model_ready

    @property
    def status(self) -> str:
        if self.rdd.is_model_ready and self.coco.is_model_ready:
            return "READY (DUAL)"
        elif self.rdd.is_model_ready:
            return "READY (RDD_ONLY)"
        elif self.coco.is_model_ready:
            return "READY (COCO_ONLY)"
        return "NOT_READY"

    def predict(
        self,
        frame: np.ndarray,
        conf_threshold: float = 0.25,
        target_classes: Optional[Sequence[int]] = None,
        frame_number: Optional[int] = None,
        timestamp: Optional[float] = None,
    ) -> List[Detection]:
        detections: List[Detection] = []

        # 1. Custom Road Damage Detection
        if self.rdd.is_model_ready:
            try:
                rdd_conf = min(conf_threshold, 0.20) if conf_threshold <= 0.25 else conf_threshold
                rdd_preds = self.rdd.predict(
                    frame,
                    conf_threshold=rdd_conf,
                    frame_number=frame_number,
                    timestamp=timestamp,
                )
                detections.extend(rdd_preds)
            except Exception:
                pass

        # 2. General Scene Object Detection (Traffic & Pedestrians)
        if self.coco.is_model_ready:
            try:
                coco_preds = self.coco.predict(
                    frame,
                    conf_threshold=conf_threshold,
                    frame_number=frame_number,
                    timestamp=timestamp,
                )

                traffic_classes = {
                    "car",
                    "truck",
                    "bus",
                    "motorcycle",
                    "bicycle",
                    "person",
                    "traffic light",
                    "stop sign",
                }
                for det in coco_preds:
                    if det.class_name in traffic_classes:
                        detections.append(det)
            except Exception:
                pass

        return detections

