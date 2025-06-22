from ultralytics import YOLO
import cv2
import numpy as np
from pathlib import Path
import logging
import torch
import json
import sys
from function.helper import PlateLocation
from flask import Flask, request, jsonify
from flask_cors import CORS

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

app = Flask(__name__)
CORS(app)

@app.route('/health')
def health_check():
    return jsonify({'status': 'healthy'}), 200

class LicensePlateDetector:
    def __init__(self):
        self.device = 'cuda' if torch.cuda.is_available() else 'cpu'
        try:            # Load all three models
            self.detector = YOLO('models/detector.pt')         # Detect license plate
            self.recognizer = YOLO('models/recognizer.pt')     # Recognize characters  
            self.province_detector = YOLO('models/province.pt') # Detect province
            logging.info("All models loaded successfully")
        except Exception as e:
            logging.error(f"Error loading models: {str(e)}")
            raise

    def detect_province(self, plate_region):
        try:
            # Use province detector model
            province_results = self.province_detector.predict(
                source=plate_region,
                conf=0.25,
                iou=0.45,
                max_det=1,  # We only need to detect one province
                device=self.device
            )[0]

            if len(province_results.boxes) == 0:
                return None, 0.0

            # Get highest confidence detection
            box = province_results.boxes[0]
            cls = int(box.cls[0].item())
            conf = float(box.conf[0].item())

            # Get province name from class index
            province_name = self.province_detector.names[cls]
            
            return province_name, conf

        except Exception as e:
            logging.error(f"Error in province detection: {str(e)}")
            return None, 0.0

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
                return None, None

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
                return plate_region, None

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

            # Get basic plate information
            plate_info = PlateLocation.parse_plate_info(plate_number)

            # Detect province using new model
            detected_province, province_conf = self.detect_province(plate_region)
            
            # Use detected province if available, otherwise use parsed province
            province = detected_province if detected_province else plate_info['province']

            # Calculate average confidence including province detection
            char_conf = sum(c[2] for c in chars) / len(chars)
            if detected_province:
                avg_confidence = (confidence + char_conf + province_conf) / 3
            else:
                avg_confidence = (confidence + char_conf) / 2

            # Create detection result
            result = {
                'plateNumber': plate_number,
                'confidence': avg_confidence,
                'province': province,
                'vehicleType': plate_info['type'],
                'provinceConfidence': province_conf if detected_province else 0.0,
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