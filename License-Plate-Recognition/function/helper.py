import math
import cv2
import numpy as np

def read_plate(model, img):
    # YOLOv8 prediction with lower confidence for character detection
    results = model(img, conf=0.25)
    if len(results) == 0:
        return "unknown"
        
    # Get character detections
    char_list = []
    for r in results:
        boxes = r.boxes
        for box in boxes:
            x1, y1, x2, y2 = box.xyxy[0].tolist()
            cls = int(box.cls[0].item())
            conf = float(box.conf[0].item())
            
            # Store position and class for sorting
            char_list.append((x1, cls))
    
    # Sort characters by x-coordinate (left to right)
    char_list.sort(key=lambda x: x[0])
    
    # Convert class indices to characters
    plate_number = ""
    for _, cls in char_list:
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