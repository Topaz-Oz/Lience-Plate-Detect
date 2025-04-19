from ultralytics import YOLO
import cv2
import numpy as np
from pathlib import Path
import logging
import torch
import json
import sys
from function.helper import PlateLocation

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

class LicensePlateDetector:
    def __init__(self):
        self.device = 'cuda' if torch.cuda.is_available() else 'cpu'
        try:
            self.detector = YOLO('model/LP_detector_nano_61.pt')
            self.recognizer = YOLO('model/LP_ocr_nano_62.pt')
            logging.info("Models loaded successfully")
        except Exception as e:
            logging.error(f"Error loading models: {str(e)}")
            raise

    def detect_license_plate(self, image_path):
        try:
            # Read image
            if isinstance(image_path, str):
                img = cv2.imread(image_path)
            else:
                img = image_path
            
            if img is None:
                raise ValueError("Could not read image")

            # Detect license plate
            detect_results = self.detector.predict(
                source=img,
                conf=0.25,
                iou=0.45,
                device=self.device
            )[0]

            if len(detect_results.boxes) == 0:
                return None, None, None

            # Get highest confidence box
            boxes = detect_results.boxes
            best_box = boxes[0]
            x1, y1, x2, y2 = map(int, best_box.xyxy[0])
            confidence = float(best_box.conf[0])

            # Crop license plate region
            plate_region = img[y1:y2, x1:x2]

            # Recognize characters
            char_results = self.recognizer.predict(
                source=plate_region,
                conf=0.25,
                iou=0.45,
                max_det=20,
                device=self.device
            )[0]

            if len(char_results.boxes) == 0:
                return plate_region, None, None

            # Process character recognition results
            chars = []
            for i in range(len(char_results.boxes)):
                cls = int(char_results.boxes.cls[i].item())
                conf = float(char_results.boxes.conf[i].item())
                x1 = float(char_results.boxes.xyxy[i][0].item())
                chars.append((x1, cls, conf))

            # Sort characters left to right
            chars.sort(key=lambda x: x[0])
            
            # Get class names from model
            names = self.recognizer.names
            plate_number = ''.join([names[c[1]] for c in chars])

            # Parse plate information
            plate_info = PlateLocation.parse_plate_info(plate_number)

            # Calculate average confidence
            avg_confidence = (confidence + sum(c[2] for c in chars) / len(chars)) / 2

            # Create detection result
            result = {
                'plateNumber': plate_number,
                'confidence': avg_confidence,
                'province': plate_info['province'],
                'vehicleType': plate_info['type'],
                'bbox': {
                    'x': x1,
                    'y': y1,
                    'width': x2 - x1,
                    'height': y2 - y1
                }
            }

            return plate_region, result

        except Exception as e:
            logging.error(f"Error in detection: {str(e)}")
            return None, None

def main():
    if len(sys.argv) != 2:
        print(json.dumps({'error': 'Image path argument required'}))
        sys.exit(1)

    image_path = sys.argv[1]
    if not Path(image_path).exists():
        print(json.dumps({'error': 'Image file not found'}))
        sys.exit(1)

    try:
        detector = LicensePlateDetector()
        _, result = detector.detect_license_plate(image_path)
        
        if result is None:
            print(json.dumps({'error': 'No license plate detected'}))
            sys.exit(1)

        print(json.dumps(result))
        sys.exit(0)

    except Exception as e:
        print(json.dumps({'error': str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main()