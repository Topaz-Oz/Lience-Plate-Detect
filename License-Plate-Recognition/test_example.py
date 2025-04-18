from ultralytics import YOLO
import cv2
import logging
import os
from function.helper import PlateLocation

# Thiết lập logging chi tiết hơn
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('test_detection.log')
    ]
)

def test_detection():
    try:
        logging.info("Bắt đầu kiểm tra nhận dạng biển số...")
        
        # Kiểm tra models
        model_paths = {
            'detector': 'model/LP_detector_nano_61.pt',
            'recognizer': 'model/LP_ocr_nano_62.pt'
        }
        
        for name, path in model_paths.items():
            if not os.path.exists(path):
                logging.error(f"Không tìm thấy model {name} tại {path}")
                return
            logging.info(f"Đã tìm thấy model {name}")
            
        # Khởi tạo models
        detector = YOLO('model/LP_detector_nano_61.pt')
        recognizer = YOLO('model/LP_ocr_nano_62.pt')
        logging.info("Đã khởi tạo xong models")

        # Đọc ảnh test
        test_images = ['test_image/119.jpg', 'test_image/bien_so.jpg', 'test_image/1.jpg']
        
        for img_path in test_images:
            if not os.path.exists(img_path):
                logging.warning(f"Không tìm thấy ảnh {img_path}")
                continue
                
            logging.info(f"\nĐang xử lý ảnh: {img_path}")
            img = cv2.imread(img_path)
            
            if img is None:
                logging.error(f"Không thể đọc ảnh {img_path}")
                continue

            # 1. Phát hiện biển số
            logging.info("Đang thực hiện detect biển số...")
            detect_results = detector(img, conf=0.25)[0]
            
            if len(detect_results.boxes) == 0:
                logging.warning("Không tìm thấy biển số trong ảnh")
                continue

            # Lấy vùng biển số
            box = detect_results.boxes[0]
            x1, y1, x2, y2 = map(int, box.xyxy[0])
            plate_region = img[y1:y2, x1:x2]
            
            # Lưu ảnh biển số đã cắt
            cv2.imwrite(f"result/plate_{os.path.basename(img_path)}", plate_region)
            logging.info("Đã lưu ảnh biển số được cắt")

            # 2. Nhận dạng ký tự
            logging.info("Đang thực hiện OCR...")
            ocr_results = recognizer(plate_region, conf=0.25)[0]
            
            if len(ocr_results.boxes) == 0:
                logging.warning("Không nhận dạng được ký tự")
                continue

            # Xử lý kết quả OCR
            chars = []
            for i in range(len(ocr_results.boxes)):
                cls = int(ocr_results.boxes.cls[i].item())
                conf = float(ocr_results.boxes.conf[i].item())
                x1 = float(ocr_results.boxes.xyxy[i][0].item())
                chars.append((x1, cls, conf))

            # Sắp xếp ký tự từ trái sang phải
            chars.sort(key=lambda x: x[0])
            plate_number = ''.join([recognizer.names[c[1]] for c in chars])
            logging.info(f"Biển số đã nhận dạng: {plate_number}")

            # 3. Phân tích thông tin biển số
            plate_info = PlateLocation.parse_plate_info(plate_number)
            logging.info(f"Tỉnh/Thành phố: {plate_info['province']}")
            logging.info(f"Loại xe: {plate_info['type']}")

            # Vẽ kết quả lên ảnh
            cv2.rectangle(img, (x1, y1), (x2, y2), (0, 255, 0), 2)
            cv2.putText(img, plate_number, (x1, y1-10), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 255, 0), 2)

            # Lưu ảnh kết quả
            output_path = f"result/detected_{os.path.basename(img_path)}"
            cv2.imwrite(output_path, img)
            logging.info(f"Đã lưu kết quả tại: {output_path}")

            # Hiển thị ảnh
            cv2.imshow("Kết quả", img)
            cv2.waitKey(0)
            
        cv2.destroyAllWindows()
        logging.info("Hoàn thành kiểm tra!")

    except Exception as e:
        logging.error(f"Lỗi: {str(e)}", exc_info=True)

if __name__ == "__main__":
    test_detection()