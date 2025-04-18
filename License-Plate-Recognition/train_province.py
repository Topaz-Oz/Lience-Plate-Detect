from ultralytics import YOLO
import torch
import logging
from datetime import datetime
import os

# Configure logging
log_file = f"training_province_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(log_file),
        logging.StreamHandler()
    ]
)

def train():
    logging.info("Initializing province recognition training...")
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
            epochs=10,          # Training 10 epochs
            imgsz=416,         # Giảm kích thước ảnh để nhẹ hơn
            batch=2,           # Batch size nhỏ cho CPU
            workers=0,         # Tắt đa luồng để giảm tải
            device='cpu',
            patience=3,        # Early stopping sau 3 epochs không cải thiện
            save_period=2,     # Lưu checkpoint mỗi 2 epochs
            lr0=0.01,         # Learning rate khởi đầu
            lrf=0.001,        # Learning rate cuối
            momentum=0.937,
            weight_decay=0.0005,
            warmup_epochs=1,   # 1 epoch warmup
            warmup_momentum=0.8,
            warmup_bias_lr=0.1,
            box=7.5,          # Tăng box loss để focus vào vị trí chính xác
            cls=0.3,          # Giảm class loss vì ít classes
            dfl=1.5,
            close_mosaic=8,   # Tắt mosaic sớm
            resume=False,
            amp=False,        # Tắt mixed precision
            name='province_detector_v8',  # Tên project mới
            exist_ok=True,
            cache=True,       # Cache images để tăng tốc
            plots=False       # Tắt vẽ đồ thị để giảm tải
        )
        
        logging.info("Training completed successfully!")
        
    except Exception as e:
        logging.error(f"An error occurred: {str(e)}")
        raise

if __name__ == "__main__":
    train()