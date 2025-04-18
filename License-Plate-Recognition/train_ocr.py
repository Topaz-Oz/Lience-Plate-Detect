from ultralytics import YOLO
import torch
import logging
from datetime import datetime
import os

# Configure logging
log_file = f"training_ocr_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(log_file),
        logging.StreamHandler()
    ]
)

def train():
    logging.info("Initializing OCR model training...")
    logging.info("Using device: CPU")
    
    try:
        # Initialize model
        model = YOLO('yolov8n.pt')
        
        # Training configuration
        results = model.train(
            data='training/Letter_detect.yaml',  # Using character detection config
            epochs=10,          # Set to 10 epochs
            imgsz=640,         # Standard image size
            batch=8,           # Batch size for CPU
            device='cpu',      # Force CPU usage
            name='LP_ocr_v8',  # Model name
            # Augmentation for character recognition
            hsv_h=0.015,
            hsv_s=0.5,
            hsv_v=0.3,
            degrees=0.0,       # Disable rotation for text
            translate=0.1,
            scale=0.2,
            shear=0.0,
            perspective=0.0,
            flipud=0.0,        # Disable flips for text
            fliplr=0.0,
            mosaic=0.5,
            mixup=0.0,
            copy_paste=0.0,
            # Training parameters
            warmup_epochs=2,
            patience=20,
            lr0=0.01,
            lrf=0.001,
            momentum=0.937,
            weight_decay=0.0005,
            # Save settings
            save_period=5,     # Save every 5 epochs
            cache=True,
            workers=1,
            exist_ok=True
        )
        
        # Validate final model
        metrics = model.val()
        logging.info("Training completed successfully!")
        
    except Exception as e:
        logging.error(f"Training error: {str(e)}")
        raise

if __name__ == "__main__":
    train()