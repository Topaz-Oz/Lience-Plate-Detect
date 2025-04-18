import math
import cv2
import numpy as np
import re

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

class PlateLocation:
    # Dictionary mapping province codes to province names
    PROVINCES = {
        '11': 'Cao Bằng', '12': 'Lạng Sơn', '14': 'Quảng Ninh', '15': 'Hải Phòng',
        '16': 'Hải Phòng', '17': 'Thái Bình', '18': 'Nam Định', '19': 'Phú Thọ',
        '20': 'Thái Nguyên', '21': 'Yên Bái', '22': 'Tuyên Quang', '23': 'Hà Giang',
        '24': 'Lào Cai', '25': 'Lai Châu', '26': 'Sơn La', '27': 'Điện Biên',
        '28': 'Hoà Bình', '29': 'Hà Nội', '30': 'Hà Nội', '31': 'Hà Nội',
        '32': 'Hà Nội', '33': 'Hà Nội', '34': 'Hải Dương', '35': 'Ninh Bình',
        '36': 'Thanh Hóa', '37': 'Nghệ An', '38': 'Hà Tĩnh', '43': 'Đà Nẵng',
        '47': 'Đắk Lắk', '48': 'Đắk Nông', '49': 'Lâm Đồng', '50': 'TPHCM',
        '51': 'TPHCM', '52': 'TPHCM', '53': 'TPHCM', '54': 'TPHCM', '55': 'TPHCM',
        '56': 'TPHCM', '57': 'TPHCM', '58': 'TPHCM', '59': 'TPHCM', '60': 'Đồng Nai',
        '61': 'Bình Dương', '62': 'Long An', '63': 'Tiền Giang', '64': 'Vĩnh Long',
        '65': 'Cần Thơ', '66': 'Đồng Tháp', '67': 'An Giang', '68': 'Kiên Giang',
        '69': 'Cà Mau', '70': 'Tây Ninh', '71': 'Bến Tre', '72': 'Bà Rịa-Vũng Tàu',
        '73': 'Quảng Bình', '74': 'Quảng Trị', '75': 'Thừa Thiên-Huế',
        '76': 'Quảng Ngãi', '77': 'Bình Định', '78': 'Phú Yên', '79': 'Khánh Hoà',
        '81': 'Gia Lai', '82': 'Kon Tum', '83': 'Sóc Trăng', '84': 'Trà Vinh',
        '85': 'Ninh Thuận', '86': 'Bình Thuận', '88': 'Vĩnh Phúc', '89': 'Hưng Yên',
        '90': 'Hà Nam', '92': 'Quảng Nam', '93': 'Bình Phước', '94': 'Bạc Liêu',
        '95': 'Hậu Giang', '97': 'Bắc Kạn', '98': 'Bắc Giang', '99': 'Bắc Ninh'
    }

    # Dictionary mapping series to vehicle types
    VEHICLE_TYPES = {
        'A': 'Quân đội',
        'B': 'Công an',
        'C': 'Chính phủ',
        'D': 'Ngoại giao',
        'E': 'Doanh nghiệp',
        'F': 'Doanh nghiệp',
        'G': 'Doanh nghiệp',
        'H': 'Doanh nghiệp',
        'K': 'Cơ quan, đơn vị sự nghiệp',
        'L': 'Cá nhân, tổ chức',
        'M': 'Cá nhân, tổ chức',
        'N': 'Cá nhân, tổ chức',
        'P': 'Cá nhân, tổ chức',
        'S': 'Taxi',
        'T': 'Tập lái',
        'V': 'Vãng lai',
        'X': 'Xe máy',
        'Y': 'Xe máy',
        'Z': 'Xe nước ngoài'
    }

    @staticmethod
    def parse_plate_info(plate_number):
        """Parse license plate number to extract province and vehicle type information."""
        if not plate_number:
            return {'province': 'Unknown', 'type': 'Unknown'}

        # Remove any whitespace and convert to uppercase
        plate = plate_number.strip().upper()

        # Extract province code (first 2 digits)
        province_match = re.match(r'(\d{2})', plate)
        province_code = province_match.group(1) if province_match else None
        province = PlateLocation.PROVINCES.get(province_code, 'Unknown')

        # Extract vehicle type (letter after province code)
        type_match = re.search(r'[A-Z]', plate)
        type_code = type_match.group() if type_match else None
        vehicle_type = PlateLocation.VEHICLE_TYPES.get(type_code, 'Unknown')

        return {
            'province': province,
            'type': vehicle_type
        }