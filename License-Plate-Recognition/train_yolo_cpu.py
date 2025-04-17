from ultralytics import YOLO
import torch
import os
import logging

# Thiết lập logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('license_plate_detection.log'),
        logging.StreamHandler()
    ]
)

try:
    logging.info("Initializing training...")
    logging.info(f"Using device: CPU")

    # Initialize model
    model = YOLO('yolov8n.pt')
    
    # Configure training với đường dẫn tương đối
    results = model.train(
        data='datasets/license_plate_ocr/dataset.yaml',
        epochs=10,
        imgsz=640,
        batch=4,  # Reduced batch size for CPU
        device='cpu',
        name='LP_character_detector_v8_cpu',
        cache=True,
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
        mosaic=0.5,
        mixup=0.0,
        copy_paste=0.0,
        # Training parameters
        warmup_epochs=3,
        patience=20,
        lr0=0.01,
        lrf=0.001,
        momentum=0.937,
        weight_decay=0.0005,
        box=7.5,
        cls=0.5,
        dfl=1.5,
        # CPU optimization
        workers=1,
        save_period=10,  # Save checkpoint every 10 epochs
        exist_ok=True  # Overwrite existing experiment
    )

    # Validate the final model
    logging.info("\nValidating model...")
    metrics = model.val()
    logging.info("Training completed successfully!")

except Exception as e:
    logging.error(f"An error occurred: {str(e)}")
    raise