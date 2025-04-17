import sys
import logging
from PIL import Image
import cv2
from ultralytics import YOLO
import function.utils_rotate as utils_rotate
import os
import time
import function.helper as helper
import numpy as np
import torch

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('license_plate_detection.log')
    ]
)

def load_model(model_path):
    if not os.path.exists(model_path):
        raise FileNotFoundError(f"Model not found: {model_path}")
    try:
        model = YOLO(model_path)
        return model
    except Exception as e:
        logging.error(f"Error loading model {model_path}: {str(e)}")
        raise

def main():
    try:
        # Check CUDA availability
        cuda_available = torch.cuda.is_available()
        logging.info(f"Using CUDA: {cuda_available}")
        if cuda_available:
            logging.info(f"GPU Device: {torch.cuda.get_device_name()}")
            
        # Load models with explicit error handling
        model_dir = 'model'
        if not os.path.exists(model_dir):
            raise FileNotFoundError(f"Model directory not found: {model_dir}")
            
        logging.info("Loading license plate detection model...")
        yolo_LP_detect = load_model('model/LP_detector_nano_61.pt')  # Using existing model until new one is trained
        
        logging.info("Loading character recognition model...")
        yolo_license_plate = load_model('model/LP_ocr_nano_62.pt')  # Using existing model until new one is trained

        prev_frame_time = 0
        new_frame_time = 0

        # Try different camera indices
        camera_indices = [1, 0]  # Try external camera first, then built-in
        vid = None
        for idx in camera_indices:
            logging.info(f"Trying camera index {idx}...")
            vid = cv2.VideoCapture(idx)
            if vid.isOpened():
                logging.info(f"Successfully opened camera {idx}")
                break
            
        if vid is None or not vid.isOpened():
            raise Exception("Could not open any camera")

        while True:
            ret, frame = vid.read()
            if not ret:
                logging.error("Failed to grab frame")
                break

            try:
                # YOLOv8 detection with confidence threshold
                results = yolo_LP_detect(frame, conf=0.6)
                list_plates = []
                
                # Process detection results
                for r in results:
                    boxes = r.boxes
                    for box in boxes:
                        # Get box coordinates and confidence
                        b = box.xyxy[0].tolist()
                        conf = float(box.conf)
                        list_plates.append([b[0], b[1], b[2], b[3], conf])
                        logging.debug(f"Detected plate with confidence: {conf:.2f}")
                
                # Process detected plates
                list_read_plates = set()
                for plate in list_plates:
                    x = max(0, int(plate[0]))
                    y = max(0, int(plate[1]))
                    w = min(int(plate[2] - plate[0]), frame.shape[1] - x)
                    h = min(int(plate[3] - plate[1]), frame.shape[0] - y)
                    
                    if w <= 0 or h <= 0:
                        continue
                        
                    try:
                        crop_img = frame[y:y+h, x:x+w]
                        cv2.rectangle(frame, (x, y), (x+w, y+h), color=(0, 0, 255), thickness=2)
                        
                        # Try different rotations for better recognition
                        for cc in range(0, 2):
                            for ct in range(0, 2):
                                rotated_img = utils_rotate.deskew(crop_img, cc, ct)
                                if rotated_img is None:
                                    continue
                                    
                                # Use helper to read plate characters
                                lp = helper.read_plate(yolo_license_plate, rotated_img)
                                if lp != "unknown":
                                    logging.debug(f"Recognized plate: {lp}")
                                    list_read_plates.add(lp)
                                    # Draw text with background
                                    text_size = cv2.getTextSize(lp, cv2.FONT_HERSHEY_SIMPLEX, 0.9, 2)[0]
                                    cv2.rectangle(frame, 
                                                (x, y-text_size[1]-10), 
                                                (x+text_size[0], y), 
                                                (0, 0, 0), 
                                                -1)
                                    cv2.putText(frame, lp, (x, y-10), 
                                              cv2.FONT_HERSHEY_SIMPLEX, 0.9, (36, 255, 12), 2)
                                    break
                            if lp != "unknown":
                                break
                    except Exception as e:
                        logging.error(f"Error processing plate: {str(e)}")
                        continue

                # Calculate and display FPS
                new_frame_time = time.time()
                fps = int(1/(new_frame_time-prev_frame_time))
                prev_frame_time = new_frame_time
                
                # Draw FPS counter with background
                fps_text = f"FPS: {fps}"
                cv2.rectangle(frame, (7, 30), (120, 80), (0, 0, 0), -1)
                cv2.putText(frame, fps_text, (10, 70), 
                          cv2.FONT_HERSHEY_SIMPLEX, 1, (100, 255, 0), 2)

                # Display detected plates
                if list_read_plates:
                    plate_text = " | ".join(list_read_plates)
                    bg_width = cv2.getTextSize(f"Detected: {plate_text}", 
                                             cv2.FONT_HERSHEY_SIMPLEX, 0.7, 2)[0][0]
                    cv2.rectangle(frame, 
                                (8, frame.shape[0]-40),
                                (bg_width+12, frame.shape[0]-10),
                                (0, 0, 0),
                                -1)
                    cv2.putText(frame, f"Detected: {plate_text}", 
                              (10, frame.shape[0]-20),
                              cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)

                cv2.imshow('License Plate Detection', frame)
                
            except Exception as e:
                logging.error(f"Error processing frame: {str(e)}")
                continue

            if cv2.waitKey(1) & 0xFF == ord('q'):
                break

    except Exception as e:
        logging.error(f"Program error: {str(e)}")
        return 1

    finally:
        if 'vid' in locals() and vid is not None:
            vid.release()
        cv2.destroyAllWindows()
        
    return 0

if __name__ == "__main__":
    sys.exit(main())