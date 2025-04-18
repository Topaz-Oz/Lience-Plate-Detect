import math
import cv2
import numpy as np

def convert_quad_to_bbox(quad_coords):
    """Convert quadrilateral coordinates to YOLO bbox format (x_center, y_center, width, height)"""
    # Convert string coordinates to float if needed
    coords = [float(x) for x in quad_coords]
    
    # Extract points
    x_coords = coords[0::2]
    y_coords = coords[1::2]
    
    # Calculate bbox
    x_min, x_max = min(x_coords), max(x_coords)
    y_min, y_max = min(y_coords), max(y_coords)
    
    # Convert to YOLO format
    x_center = (x_min + x_max) / 2
    y_center = (y_min + y_max) / 2
    width = x_max - x_min
    height = y_max - y_min
    
    return [x_center, y_center, width, height]

def process_label_file(label_path, output_path):
    """Convert label file from quadrilateral format to YOLO bbox format"""
    with open(label_path, 'r') as f:
        lines = f.readlines()
    
    new_lines = []
    for line in lines:
        parts = line.strip().split()
        if len(parts) == 9:  # class + 4 points (8 coordinates)
            cls = parts[0]
            coords = parts[1:]
            bbox = convert_quad_to_bbox(coords)
            new_line = f"{cls} {' '.join(map(str, bbox))}\n"
            new_lines.append(new_line)
    
    with open(output_path, 'w') as f:
        f.writelines(new_lines)

def read_plate(model, img):
    # YOLOv8 prediction with configuration optimized for character detection
    results = model.predict(
        source=img,
        conf=0.25,     # Lower confidence threshold to detect more characters
        iou=0.45,      # IOU threshold for NMS
        max_det=20,    # Maximum detections per image
        verbose=False  # Suppress output
    )
    
    if len(results) == 0 or len(results[0].boxes) == 0:
        return "unknown"
    
    # Get character detections from first image
    boxes = results[0].boxes
    char_list = []
    
    # Extract all detections
    for i in range(len(boxes)):
        x1 = float(boxes.xyxy[i][0].item())  # Get left x coordinate
        cls = int(boxes.cls[i].item())       # Get class index
        conf = float(boxes.conf[i].item())   # Get confidence
        
        # Only add high confidence detections
        if conf > 0.25:
            char_list.append((x1, cls, conf))
    
    if not char_list:
        return "unknown"
        
    # Sort characters by x-coordinate (left to right)
    char_list.sort(key=lambda x: x[0])
    
    # Convert class indices to characters with confidence filtering
    plate_number = ""
    for _, cls, conf in char_list:
        plate_number += str(model.names[cls])
    
    return plate_number if plate_number else "unknown"

def linear_equation(x1, y1, x2, y2):
    if x2 - x1 == 0:  # Vertical line
        return None, x1
    b = y1 - (y2 - y1) * x1 / (x2 - x1)
    a = (y1 - b) / x1 if x1 != 0 else (y2 - b) / x2
    return a, b

def check_point_linear(x, y, x1, y1, x2, y2):
    result = linear_equation(x1, y1, x2, y2)
    if result is None:  # Vertical line
        x_line = result[1]
        return math.isclose(x, x_line, abs_tol=3)
    else:
        a, b = result
        y_pred = a*x + b
        return math.isclose(y_pred, y, abs_tol=3)

def order_points(pts):
    rect = np.zeros((4, 2), dtype="float32")
    s = pts.sum(axis=1)
    rect[0] = pts[np.argmin(s)]
    rect[2] = pts[np.argmax(s)]
    diff = np.diff(pts, axis=1)
    rect[1] = pts[np.argmin(diff)]
    rect[3] = pts[np.argmax(diff)]
    return rect

def four_point_transform(image, pts):
    rect = order_points(pts)
    (tl, tr, br, bl) = rect
    widthA = np.sqrt(((br[0] - bl[0]) ** 2) + ((br[1] - bl[1]) ** 2))
    widthB = np.sqrt(((tr[0] - tl[0]) ** 2) + ((tr[1] - tl[1]) ** 2))
    maxWidth = max(int(widthA), int(widthB))
    heightA = np.sqrt(((tr[0] - br[0]) ** 2) + ((tr[1] - br[1]) ** 2))
    heightB = np.sqrt(((tl[0] - bl[0]) ** 2) + ((tl[1] - bl[1]) ** 2))
    maxHeight = max(int(heightA), int(heightB))
    dst = np.array([
        [0, 0],
        [maxWidth - 1, 0],
        [maxWidth - 1, maxHeight - 1],
        [0, maxHeight - 1]], dtype="float32")
    M = cv2.getPerspectiveTransform(rect, dst)
    warped = cv2.warpPerspective(image, M, (maxWidth, maxHeight))
    return warped