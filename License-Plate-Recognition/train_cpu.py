from ultralytics import YOLO
import torch
import os
from pathlib import Path

# Print device info
print(f"Training on CPU")
print(f"PyTorch version: {torch.__version__}")

# Initialize model
model = YOLO('yolov8n.pt')

# Get absolute path to dataset.yaml
DATASET_PATH = Path(__file__).parent / 'datasets' / 'license_plate_ocr' / 'dataset.yaml'
print(f"Dataset path: {DATASET_PATH}")

try:
    # Configure training with CPU optimizations
    results = model.train(
        data=str(DATASET_PATH),
        epochs=100,
        imgsz=640,
        batch=4,  # Reduced batch size for CPU
        device='cpu',
        workers=0,  # Single worker for CPU
        name='LP_detector_v8_cpu',
        cache=True,  # Cache images for faster training
        # Data augmentation (reduced for CPU)
        hsv_h=0.015,
        hsv_s=0.5,
        hsv_v=0.3,
        degrees=2.0,
        translate=0.1,
        scale=0.2,
        shear=0.0,
        perspective=0.0,
        flipud=0.01,
        fliplr=0.01,
        mosaic=0.5,  # Reduced mosaic augmentation
        mixup=0.0,   # Disabled for CPU
        copy_paste=0.0,  # Disabled for CPU
        # Training parameters
        warmup_epochs=3,
        patience=20,  # Early stopping
        lr0=0.01,
        lrf=0.001,
        momentum=0.937,
        weight_decay=0.0005,
        box=7.5,
        cls=0.5,
        dfl=1.5,
        close_mosaic=10,
        # Save and validation
        save_period=10,  # Save checkpoint every 10 epochs
        exist_ok=True,  # Overwrite existing experiment
        # Project organization
        project='runs/train',
        save=True,
        plots=True  # Save training plots
    )

    # Validate the final model
    print("\nValidating model...")
    metrics = model.val()
    
    print("\nTraining completed successfully!")
    print(f"Results saved to {Path('runs/train/LP_detector_v8_cpu')}")

except Exception as e:
    print(f"An error occurred: {str(e)}")
    raise