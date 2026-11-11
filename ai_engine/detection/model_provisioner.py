"""
UrbanSense AI - Model Provisioning & Storage Management Subsystem

Provides centralized, secure model path resolution, persistent storage detection,
and automated provisioning for cloud container deployments (Render, Docker).
"""

import logging
import os
from pathlib import Path
import shutil
import tempfile
from typing import Dict, Optional, Tuple
import urllib.parse

logger = logging.getLogger("urbansense.models")

REPO_ROOT = Path(__file__).resolve().parent.parent.parent


def get_data_dir() -> Path:
    """
    Resolve the root data directory.
    Priority:
      1. DATA_DIR environment variable (e.g. '/app/data' on Render persistent disk)
      2. Local repository data directory ('<repo_root>/data')
    """
    env_dir = os.getenv("DATA_DIR")
    if env_dir:
        path = Path(env_dir)
    else:
        path = REPO_ROOT / "data"
    path.mkdir(parents=True, exist_ok=True)
    return path


def get_models_dir() -> Path:
    """
    Resolve the persistent models directory.
    Priority:
      1. MODELS_DIR environment variable
      2. '<DATA_DIR>/models'
      3. '<repo_root>/models'
    """
    env_dir = os.getenv("MODELS_DIR")
    if env_dir:
        path = Path(env_dir)
    else:
        path = get_data_dir() / "models"
    path.mkdir(parents=True, exist_ok=True)
    return path


def resolve_road_damage_model_path(model_path: Optional[str] = None) -> str:
    """
    Resolve the custom road damage model weights path across local and persistent storage.
    """
    # 1. Explicit argument
    if model_path:
        p = Path(model_path)
        if p.is_file():
            return str(p.resolve())

    # 2. Configurable environment variable
    env_path = os.getenv("ROAD_DAMAGE_MODEL_PATH")
    if env_path:
        p = Path(env_path)
        return str(p.resolve()) if p.is_absolute() else str((REPO_ROOT / p).resolve())

    # 3. Standard persistent and repository candidates
    candidates = [
        get_models_dir() / "best.pt",
        get_models_dir() / "road_damage" / "best.pt",
        REPO_ROOT / "models" / "road_damage" / "best.pt",
        Path.cwd() / "models" / "road_damage" / "best.pt",
        REPO_ROOT / "ai_engine" / "models" / "road_damage_yolo11n.pt",
    ]

    for candidate in candidates:
        if candidate and candidate.is_file():
            return str(candidate.resolve())

    # Fallback default location
    return str((REPO_ROOT / "models" / "road_damage" / "best.pt").resolve())


def resolve_general_model_path(model_path: Optional[str] = None, default_name: str = "yolo11n.pt") -> str:
    """
    Resolve general COCO model weights path across local and persistent storage.
    """
    # 1. Explicit argument
    if model_path:
        p = Path(model_path)
        if p.is_file():
            return str(p.resolve())

    # 2. Configurable environment variables
    env_path = os.getenv("GENERAL_MODEL_PATH") or os.getenv("YOLO_MODEL_PATH")
    if env_path:
        p = Path(env_path)
        return str(p.resolve()) if p.is_absolute() else str((REPO_ROOT / p).resolve())

    # 3. Standard persistent and repository candidates
    candidates = [
        get_models_dir() / default_name,
        REPO_ROOT / default_name,
        Path.cwd() / default_name,
        REPO_ROOT / "models" / default_name,
    ]

    for candidate in candidates:
        if candidate and candidate.is_file():
            return str(candidate.resolve())

    # Fallback to default filename (Ultralytics auto-downloads to current dir if needed)
    return str((REPO_ROOT / default_name).resolve())


def download_model_weights(
    target_path: Path,
    source_url: str,
    auth_token: Optional[str] = None,
    timeout: int = 120,
) -> bool:
    """
    Securely download model weights file from a configured HTTPS URL into persistent storage.
    Uses atomic temporary file write to prevent partial/corrupted weights.
    """
    try:
        import requests

        parsed = urllib.parse.urlparse(source_url)
        # Redact credentials/query params in logs
        sanitized_url = f"{parsed.scheme}://{parsed.netloc}{parsed.path}"
        logger.info(f"Provisioning model weights from remote storage: {sanitized_url} -> {target_path}")

        headers = {}
        if auth_token:
            headers["Authorization"] = f"Bearer {auth_token}"

        target_path.parent.mkdir(parents=True, exist_ok=True)

        with requests.get(source_url, headers=headers, stream=True, timeout=timeout) as response:
            response.raise_for_status()
            total_size = int(response.headers.get("content-length", 0))

            with tempfile.NamedTemporaryFile(delete=False, dir=str(target_path.parent)) as tmp_file:
                tmp_path = Path(tmp_file.name)
                for chunk in response.iter_content(chunk_size=1024 * 1024):
                    if chunk:
                        tmp_file.write(chunk)

            # Validate non-empty file
            downloaded_size = tmp_path.stat().st_size
            if downloaded_size < 1024:
                tmp_path.unlink(missing_ok=True)
                logger.error(f"Downloaded weights file is invalid or too small ({downloaded_size} bytes).")
                return False

            # Atomically replace target
            shutil.move(str(tmp_path), str(target_path))
            logger.info(f"Successfully provisioned model weights ({round(downloaded_size / 1024 / 1024, 2)} MB) to {target_path}")
            return True

    except Exception as err:
        logger.error(f"Failed to download model weights: {err}")
        return False


def provision_models_if_configured() -> Dict[str, Dict[str, any]]:
    """
    Scan environment for remote model URLs and provision into persistent storage if not present.
    Executes once during application startup hook.
    """
    results = {}

    # 1. Custom Road Damage Model
    rdd_target = Path(resolve_road_damage_model_path())
    rdd_url = os.getenv("ROAD_DAMAGE_MODEL_URL")
    rdd_token = os.getenv("ROAD_DAMAGE_MODEL_TOKEN") or os.getenv("MODEL_DOWNLOAD_TOKEN")

    if not rdd_target.is_file() and rdd_url:
        # If target path is in non-writable repo dir, prefer models dir
        if not os.access(rdd_target.parent, os.W_OK):
            rdd_target = get_models_dir() / "best.pt"
        success = download_model_weights(rdd_target, rdd_url, auth_token=rdd_token)
        results["road_damage"] = {"path": str(rdd_target), "downloaded": success, "ready": rdd_target.is_file()}
    else:
        results["road_damage"] = {"path": str(rdd_target), "downloaded": False, "ready": rdd_target.is_file()}

    # 2. General COCO Model
    gen_target = Path(resolve_general_model_path())
    gen_url = os.getenv("GENERAL_MODEL_URL")
    gen_token = os.getenv("GENERAL_MODEL_TOKEN") or os.getenv("MODEL_DOWNLOAD_TOKEN")

    if not gen_target.is_file() and gen_url:
        if not os.access(gen_target.parent, os.W_OK):
            gen_target = get_models_dir() / "yolo11n.pt"
        success = download_model_weights(gen_target, gen_url, auth_token=gen_token)
        results["general"] = {"path": str(gen_target), "downloaded": success, "ready": gen_target.is_file()}
    else:
        results["general"] = {"path": str(gen_target), "downloaded": False, "ready": gen_target.is_file()}

    return results


def inspect_model_readiness(model_path: str) -> Tuple[bool, str, Optional[int], Optional[str]]:
    """
    Lightweight diagnostic check without loading PyTorch tensors into memory.
    Returns: (is_ready, status, file_size_bytes, error_message)
    """
    path = Path(model_path)
    if not path.is_file():
        return (
            False,
            "NOT_READY",
            None,
            f"Weights file not found at '{model_path}'. Provision via persistent storage or configure ROAD_DAMAGE_MODEL_URL.",
        )

    try:
        size = path.stat().st_size
        if size < 1024:
            return (False, "NOT_READY", size, f"Weights file '{model_path}' is corrupted or empty ({size} bytes).")
        return (True, "READY", size, None)
    except Exception as err:
        return (False, "NOT_READY", None, f"Error inspecting weights file '{model_path}': {err}")

