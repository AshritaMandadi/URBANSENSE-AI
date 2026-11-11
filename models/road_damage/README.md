# UrbanSense AI - Road Damage Model Weights

This directory holds the fine-tuned YOLO11n road damage weights for UrbanSense AI.

## Target Model Location
```
models/road_damage/best.pt
```

## How to Deploy Your Trained Model
1. Once Google Colab or Kaggle training finishes, download `best.pt`.
2. Copy `best.pt` to this folder:
   ```bash
   cp /path/to/downloaded/best.pt models/road_damage/best.pt
   ```
3. Alternatively, specify a custom path using the environment variable:
   ```bash
   export ROAD_DAMAGE_MODEL_PATH="/path/to/your/custom/best.pt"
   ```
4. Verify deployment:
   ```bash
   curl http://localhost:8000/health
   ```
   The `road_damage_model.status` field will transition from `NOT_READY` to `READY`.

