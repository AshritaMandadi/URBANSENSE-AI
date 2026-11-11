"""
UrbanSense AI - Official RDD2022 India Subset Stream Downloader

Downloads the exact 502.3 MB official RDD2022 India archive directly from the
official Figshare repository (DOI: 10.6084/m9.figshare.21431547).
Extracts only the India subset without downloading other countries (Norway, etc.).
"""

import os
from pathlib import Path
import sys
import time
import zipfile

import requests


START_OFFSET = 609341079
TARGET_SIZE = 526709145  # 502.3 MB
END_OFFSET = START_OFFSET + TARGET_SIZE - 1  # 1136050223
CHUNK_SIZE = 8 * 1024 * 1024  # 8 MB chunks


def get_fresh_signed_url() -> str:
    """Obtain a fresh signed download URL from Figshare API."""
    for attempt in range(10):
        try:
            r = requests.get(
                "https://ndownloader.figshare.com/files/38030910",
                allow_redirects=False,
                headers={"User-Agent": "curl/8.7.1"},
                timeout=15,
            )
            if r.status_code in (301, 302, 303, 307):
                return r.headers["Location"]
            time.sleep(1 + attempt)
        except Exception as err:
            time.sleep(1 + attempt)
    raise RuntimeError("Failed to obtain signed URL from Figshare after 10 attempts.")


def download_india_zip(output_path: Path) -> Path:
    """Download the official India subset archive with resume support."""
    output_path.parent.mkdir(parents=True, exist_ok=True)

    downloaded = 0
    if output_path.exists():
        downloaded = output_path.stat().st_size
        if downloaded == TARGET_SIZE:
            print(f"Archive already downloaded completely ({downloaded} bytes). Verifying integrity...")
            return output_path
        elif downloaded > TARGET_SIZE:
            print("Existing archive size mismatch. Re-downloading from scratch...")
            output_path.unlink()
            downloaded = 0
        else:
            print(f"Resuming download from byte {downloaded}/{TARGET_SIZE} ({(downloaded/TARGET_SIZE)*100:.1f}%)...")

    mode = "ab" if downloaded > 0 else "wb"
    with open(output_path, mode) as f:
        while downloaded < TARGET_SIZE:
            chunk_start = START_OFFSET + downloaded
            chunk_end = min(chunk_start + CHUNK_SIZE - 1, END_OFFSET)
            current_chunk_size = chunk_end - chunk_start + 1

            chunk_downloaded = False
            for retry in range(5):
                try:
                    signed_url = get_fresh_signed_url()
                    headers = {
                        "Range": f"bytes={chunk_start}-{chunk_end}",
                        "User-Agent": "curl/8.7.1",
                    }

                    resp = requests.get(signed_url, headers=headers, timeout=20)
                    if resp.status_code not in (200, 206):
                        raise RuntimeError(f"Range request failed with HTTP {resp.status_code}")

                    data = resp.content
                    if len(data) != current_chunk_size:
                        raise RuntimeError(f"Expected {current_chunk_size} bytes, got {len(data)}")

                    f.write(data)
                    f.flush()
                    downloaded += len(data)
                    chunk_downloaded = True
                    break
                except Exception as err:
                    print(f"Warning: Chunk at {chunk_start} attempt {retry+1}/5 failed ({err}). Retrying...", flush=True)
                    time.sleep(2 * (retry + 1))

            if not chunk_downloaded:
                raise RuntimeError(f"Failed to download chunk starting at {chunk_start} after 5 retries.")

            pct = (downloaded / TARGET_SIZE) * 100
            mb = downloaded / (1024 * 1024)
            print(f"Progress: {mb:.1f} MB / {TARGET_SIZE / (1024 * 1024):.1f} MB ({pct:.1f}%)", flush=True)

    print("Download completed! Verifying zip integrity...")
    return output_path


def verify_and_extract(zip_path: Path, extract_dir: Path) -> None:
    """Verify archive integrity and extract the India train/test directory."""
    with zipfile.ZipFile(zip_path, "r") as z:
        corrupt = z.testzip()
        if corrupt is not None:
            raise RuntimeError(f"Corrupt file in zip archive: {corrupt}")
        print("Archive integrity verified (testzip passed successfully)!")

        print(f"Extracting {len(z.namelist())} files into {extract_dir}...")
        z.extractall(extract_dir)
        print("Extraction complete!")


def main():
    repo_root = Path(__file__).resolve().parent.parent.parent
    raw_dir = repo_root / "datasets" / "rdd2022" / "raw"
    zip_path = raw_dir / "RDD2022_India.zip"

    print("=== UrbanSense AI - Official RDD2022 India Downloader ===")
    print("Source: Figshare Official Archive (DOI: 10.6084/m9.figshare.21431547)")
    print(f"Destination: {zip_path}")
    print(f"Target file size: {TARGET_SIZE} bytes (~502.3 MB)")

    download_india_zip(zip_path)
    verify_and_extract(zip_path, raw_dir)
    print("\nDataset ready under:", raw_dir / "India")


if __name__ == "__main__":
    main()
