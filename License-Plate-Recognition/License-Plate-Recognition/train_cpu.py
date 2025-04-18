from ultralytics import YOLO
import torch
import logging
from datetime import datetime
import os

# Configure logging
log_file = f"training_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(log_file),
        logging.StreamHandler()
    ]
)

def train():
    logging.info("Initializing training...")
    logging.info("Using device: CPU")
    logging.info(f"Current working directory: {os.getcwd()}")
    
    try:
        # Dataset configuration
        dataset_yaml = "datasets/license_plate_ocr/dataset.yaml"
        logging.info(f"Dataset path: {os.path.abspath(dataset_yaml)}")
        
        # Initialize model
        model = YOLO('yolov8n.pt')
        
        # Training với cấu hình nhẹ cho CPU
        results = model.train(
            data=dataset_yaml,
            epochs=10,          # Giảm xuống 10 epochs
            imgsz=416,         # Giảm kích thước ảnh xuống để nhẹ hơn
            batch=2,           # Giảm batch size
            workers=0,         # Tắt đa luồng để giảm tải
            device='cpu',
            patience=3,        # Giảm patience để dừng sớm nếu không cải thiện
            save_period=2,     # Lưu checkpoint mỗi 2 epochs
            lr0=0.01,         # Initial learning rate
            lrf=0.001,        # Final learning rate
            momentum=0.937,
            weight_decay=0.0005,
            warmup_epochs=1,   # Giảm warmup epochs
            warmup_momentum=0.8,
            warmup_bias_lr=0.1,
            box=7.5,
            cls=0.5,
            dfl=1.5,
            close_mosaic=8,    # Tắt mosaic sớm hơn
            resume=False,
            amp=False,         # Tắt mixed precision
            name='LP_ocr_v8_light',
            exist_ok=True,
            cache=True,        # Cache images để tăng tốc
            plots=False        # Tắt vẽ đồ thị để giảm tải
        )
        
        logging.info("Training completed successfully!")
        
    except Exception as e:
        logging.error(f"An error occurred: {str(e)}")
        raise

if __name__ == "__main__":
    train()