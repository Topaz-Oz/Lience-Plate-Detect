import numpy as np
import cv2
import math

def changeContrast(img):
    lab= cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
    l_channel, a, b = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8,8))
    cl = clahe.apply(l_channel)
    limg = cv2.merge((cl,a,b))
    enhanced_img = cv2.cvtColor(limg, cv2.COLOR_LAB2BGR)
    return enhanced_img

def deskew(image, cc, ct):
    try:
        # Convert to grayscale if image is color
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image.copy()
            
        # Apply threshold to get binary image
        thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)[1]
        
        # Find contours
        contours, _ = cv2.findContours(thresh, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
        
        # Find largest contour by area
        largest_contour = max(contours, key=cv2.contourArea, default=None)
        if largest_contour is None:
            return None
            
        # Get rotated rectangle
        rect = cv2.minAreaRect(largest_contour)
        angle = rect[-1]
        
        # Adjust angle based on input parameters
        if cc == 1:
            if angle < -45:
                angle = 90 + angle
        else:
            if angle > -45:
                angle = -90 + angle
                
        # Additional rotation if needed
        if ct == 1:
            angle += 180
            
        # Get image center and create rotation matrix
        (h, w) = image.shape[:2]
        center = (w // 2, h // 2)
        M = cv2.getRotationMatrix2D(center, angle, 1.0)
        
        # Perform rotation
        rotated = cv2.warpAffine(image, M, (w, h), 
                                flags=cv2.INTER_CUBIC, 
                                borderMode=cv2.BORDER_REPLICATE)
        
        return rotated
        
    except Exception as e:
        print(f"Error in deskew: {str(e)}")
        return None

def rotate_image(mat, angle):
    # Get image dimensions
    height, width = mat.shape[:2]
    image_center = (width/2, height/2)

    # Get rotation matrix
    rotation_mat = cv2.getRotationMatrix2D(image_center, angle, 1.0)

    # Get sine and cosine from rotation matrix
    abs_cos = abs(rotation_mat[0, 0])
    abs_sin = abs(rotation_mat[0, 1])

    # Find new image dimensions
    bound_w = int(height * abs_sin + width * abs_cos)
    bound_h = int(height * abs_cos + width * abs_sin)

    # Adjust rotation matrix for new dimensions
    rotation_mat[0, 2] += bound_w/2 - image_center[0]
    rotation_mat[1, 2] += bound_h/2 - image_center[1]

    # Perform rotation and return
    rotated_mat = cv2.warpAffine(mat, rotation_mat, (bound_w, bound_h))
    return rotated_mat

