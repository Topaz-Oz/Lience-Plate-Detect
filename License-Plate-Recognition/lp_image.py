from ultralytics import YOLO
import cv2
import numpy as np
from pathlib import Path
import logging
import torch
from function.helper import PlateLocation  # Corrected import path

# Thiết lập logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

class LicensePlateDetector:
    def __init__(self):
        self.device = 'cpu'
        # Load models
        try:
            # Sử dụng model YOLOv8 mới thay vì model YOLOv5 cũ
            self.detector = YOLO('runs/train/LP_detector_v8_cpu/weights/best.pt')
            self.recognizer = YOLO('runs/train/LP_ocr_v8/weights/best.pt')
            logging.info("Models loaded successfully")
        except Exception as e:
            logging.error(f"Error loading models: {str(e)}")
            # Nếu không tìm thấy model đã train, sử dụng model base
            try:
                self.detector = YOLO('yolov8n.pt')
                self.recognizer = YOLO('yolov8n.pt')
                logging.info("Using base YOLOv8n models")
            except Exception as e:
                logging.error(f"Error loading base models: {str(e)}")
                raise

    def detect_license_plate(self, image_path):
        try:
            # Đọc ảnh
            if isinstance(image_path, str):
                img = cv2.imread(image_path)
            else:
                img = image_path
            
            if img is None:
                raise ValueError("Could not read image")

            # Detect biển số xe
            results = self.detector.predict(
                source=img,
                conf=0.25,
                iou=0.45,
                device=self.device
            )

            if len(results) == 0 or len(results[0].boxes) == 0:
                logging.warning("No license plate detected")
                return None, None, None

            # Lấy box có confidence cao nhất
            boxes = results[0].boxes
            best_box = boxes[0]
            x1, y1, x2, y2 = map(int, best_box.xyxy[0])

            # Cắt vùng biển số
            plate_region = img[y1:y2, x1:x2]
            
            # Nhận dạng ký tự
            char_results = self.recognizer.predict(
                source=plate_region,
                conf=0.25,
                iou=0.45,
                max_det=20,
                device=self.device
            )

            if len(char_results) == 0 or len(char_results[0].boxes) == 0:
                logging.warning("No characters detected")
                return plate_region, "", None

            # Xử lý kết quả nhận dạng ký tự
            boxes = char_results[0].boxes
            chars = []
            for i in range(len(boxes)):
                cls = int(boxes.cls[i].item())
                conf = float(boxes.conf[i].item())
                x1 = float(boxes.xyxy[i][0].item())
                chars.append((x1, cls, conf))

            # Sắp xếp ký tự từ trái sang phải
            chars.sort(key=lambda x: x[0])
            
            # Lấy tên class từ model
            names = self.recognizer.names
            plate_number = ''.join([names[c[1]] for c in chars])

            # Phân tích thông tin biển số
            plate_info = PlateLocation.parse_plate_info(plate_number)

            logging.info(f"Detected plate: {plate_number}, Province: {plate_info['province']}, Type: {plate_info['type']}")
            return plate_region, plate_number, plate_info

        except Exception as e:
            logging.error(f"Error in detection: {str(e)}")
            return None, None, None

    def process_video(self, video_path):
        try:
            cap = cv2.VideoCapture(video_path)
            if not cap.isOpened():
                raise ValueError("Could not open video file")

            while cap.isOpened():
                ret, frame = cap.read()
                if not ret:
                    break

                plate_img, plate_number, plate_info = self.detect_license_plate(frame)
                
                if plate_number and plate_info:
                    # Vẽ kết quả lên frame
                    text = f"{plate_number} - {plate_info['province']}"
                    if plate_info['type']:
                        text += f" ({plate_info['type']})"
                    
                    cv2.putText(frame, text, (10, 30), 
                              cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
                
                cv2.imshow('License Plate Detection', frame)
                
                if cv2.waitKey(1) & 0xFF == ord('q'):
                    break

            cap.release()
            cv2.destroyAllWindows()

        except Exception as e:
            logging.error(f"Error processing video: {str(e)}")

if __name__ == "__main__":
    # Test detector
    detector = LicensePlateDetector()
    
    # Test với ảnh
    image_path = "test_image/bien_so.jpg"
    plate_img, plate_number, plate_info = detector.detect_license_plate(image_path)
    
    if plate_img is not None and plate_number:
        print(f"Detected plate: {plate_number}")
        if plate_info:
            print(f"Province: {plate_info['province']}")
            print(f"Vehicle type: {plate_info['type']}")
        
        cv2.imshow("Plate", plate_img)
        cv2.waitKey(0)
        cv2.destroyAllWindows()