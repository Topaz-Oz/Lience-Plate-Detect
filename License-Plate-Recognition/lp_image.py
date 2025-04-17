from ultralytics import YOLO
import cv2
import torch
import function.utils_rotate as utils_rotate
import function.helper as helper
import numpy as np
import logging
import os

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

def process_image(image_path, lp_detector, char_detector, conf_threshold=0.5):
    logging.info(f"Processing image: {image_path}")
    # Read image
    img = cv2.imread(image_path)
    if img is None:
        raise ValueError(f"Could not read image: {image_path}")
    
    logging.info("Detecting license plates...")
    # YOLOv8 detection
    results = lp_detector(img, conf=conf_threshold)
    if len(results) == 0:
        logging.info("No license plates detected")
        return img, []
        
    list_plates = []
    # Process detection results
    for r in results:
        boxes = r.boxes
        for box in boxes:
            # Get box coordinates and confidence
            b = box.xyxy[0].tolist()
            conf = float(box.conf)
            list_plates.append([b[0], b[1], b[2], b[3], conf])
            logging.info(f"Found license plate with confidence: {conf:.2f}")
    
    # Process each detected plate
    detected_plates = []
    for plate in list_plates:
        x = max(0, int(plate[0]))
        y = max(0, int(plate[1]))
        w = min(int(plate[2] - plate[0]), img.shape[1] - x)
        h = min(int(plate[3] - plate[1]), img.shape[0] - y)
        
        if w <= 0 or h <= 0:
            continue
            
        try:
            # Crop and process license plate
            crop_img = img[y:y+h, x:x+w]
            cv2.rectangle(img, (x, y), (x+w, y+h), color=(0, 0, 255), thickness=2)
            
            # Try different rotations for better recognition
            plate_text = "unknown"
            for cc in range(0, 2):
                for ct in range(0, 2):
                    rotated = utils_rotate.deskew(crop_img, cc, ct)
                    if rotated is None:
                        continue
                        
                    text = helper.read_plate(char_detector, rotated)
                    if text != "unknown":
                        plate_text = text
                        logging.info(f"Detected plate number: {text}")
                        # Draw text with background
                        text_size = cv2.getTextSize(text, cv2.FONT_HERSHEY_SIMPLEX, 0.9, 2)[0]
                        cv2.rectangle(img, 
                                    (x, y-text_size[1]-10), 
                                    (x+text_size[0], y), 
                                    (0, 0, 0), 
                                    -1)
                        cv2.putText(img, text, (x, y-10), 
                                  cv2.FONT_HERSHEY_SIMPLEX, 0.9, (36, 255, 12), 2)
                        detected_plates.append(text)
                        break
                if plate_text != "unknown":
                    break
        except Exception as e:
            logging.error(f"Error processing plate: {str(e)}")
            continue
                
    return img, detected_plates

if __name__ == "__main__":
    logging.info("Starting license plate detection...")
    # Check CUDA availability
    logging.info(f"Using CUDA: {torch.cuda.is_available()}")
    if torch.cuda.is_available():
        logging.info(f"GPU Device: {torch.cuda.get_device_name()}")
    
    # Load models
    try:
        logging.info("Loading detection model...")
        lp_detector = YOLO('model/LP_detector_nano_61.pt')  # Using existing model until new one is trained
        logging.info("Loading OCR model...")
        char_detector = YOLO('model/LP_ocr_nano_62.pt')  # Using existing model until new one is trained
    except Exception as e:
        logging.error(f"Error loading models: {str(e)}")
        exit(1)
        
    # Process test images
    test_images = [
        'test_image/1.jpg',
        'test_image/3.jpg',
        'test_image/4.jpg',
        'test_image/bien_so.jpg'
    ]
    
    for img_path in test_images:
        try:
            logging.info(f"\nProcessing {img_path}")
            result_img, plates = process_image(img_path, lp_detector, char_detector)
            
            if plates:
                logging.info(f"Detected plates: {', '.join(plates)}")
            else:
                logging.info("No plates detected")
                
            # Create result directory if it doesn't exist
            os.makedirs('result', exist_ok=True)
                
            # Save result
            output_path = f"result/{os.path.basename(img_path)}"
            cv2.imwrite(output_path, result_img)
            logging.info(f"Result saved to {output_path}")
            
            # Display result
            cv2.imshow('Result', result_img)
            if cv2.waitKey(0) & 0xFF == ord('q'):
                break
            
        except Exception as e:
            logging.error(f"Error processing {img_path}: {str(e)}")
            continue
            
    cv2.destroyAllWindows()