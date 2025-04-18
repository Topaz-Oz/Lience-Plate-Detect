import sys
import logging
from ultralytics import YOLO
import cv2
import torch
import os

# Set up logging to file
logging.basicConfig(
    filename='debug_output.log',
    level=logging.DEBUG,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

try:
    # Log system info
    logging.info(f"Python version: {sys.version}")
    logging.info(f"PyTorch version: {torch.__version__}")
    logging.info(f"OpenCV version: {cv2.__version__}")
    logging.info(f"CUDA available: {torch.cuda.is_available()}")
    if torch.cuda.is_available():
        logging.info(f"GPU Device: {torch.cuda.get_device_name()}")

    # Check model files
    model_files = [
        'model/LP_detector_nano_61.pt',
        'model/LP_ocr_nano_62.pt'
    ]
    
    for model_path in model_files:
        if os.path.exists(model_path):
            logging.info(f"Model file exists: {model_path}")
            file_size = os.path.getsize(model_path)
            logging.info(f"Model size: {file_size/1024/1024:.2f} MB")
            
            # Try to load model
            try:
                model = YOLO(model_path)
                logging.info(f"Successfully loaded model: {model_path}")
            except Exception as e:
                logging.error(f"Error loading model {model_path}: {str(e)}")
        else:
            logging.error(f"Model file not found: {model_path}")

    # Try inference on a test image
    test_image = 'test_image/1.jpg'
    if os.path.exists(test_image):
        logging.info(f"Test image exists: {test_image}")
        try:
            model = YOLO('model/LP_detector_nano_61.pt')
            results = model(test_image)
            logging.info(f"Inference successful. Detected {len(results[0].boxes)} objects")
        except Exception as e:
            logging.error(f"Error during inference: {str(e)}")
    else:
        logging.error(f"Test image not found: {test_image}")

except Exception as e:
    logging.error(f"Debug script error: {str(e)}")
    print(f"Error occurred. Check debug_output.log for details.")