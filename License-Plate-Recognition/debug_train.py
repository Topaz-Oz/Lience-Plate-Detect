from ultralytics import YOLO
import logging
from pathlib import Path

# Thiết lập logging
logging.basicConfig(level=logging.INFO)

def test_training():
    try:
        # Initialize model
        model = YOLO('yolov8n.pt')
        
        # Dataset path
        dataset_path = Path('datasets/license_plate_ocr/dataset.yaml')
        
        # Training với ít epoch và ít ảnh
        results = model.train(
            data=str(dataset_path),
            epochs=1,       # Chỉ train 1 epoch
            imgsz=640,
            batch=2,        # Batch size nhỏ
            device='cpu',
            workers=0,
            name='debug_training',
            cache=True,
            patience=1,
            save=True,
            plots=True
        )
        
        logging.info("Debug training completed!")
        
        # Test prediction
        test_img = "test_image/bien_so.jpg"
        results = model.predict(test_img, conf=0.25)
        logging.info(f"Test prediction completed with {len(results[0].boxes)} detections")
        
    except Exception as e:
        logging.error(f"Error in debug training: {str(e)}")
        raise

if __name__ == "__main__":
    test_training()