from ultralytics import YOLO
import torch
import os

# Kiểm tra GPU
print(f"Using CUDA: {torch.cuda.is_available()}")
if torch.cuda.is_available():
    print(f"GPU Device: {torch.cuda.get_device_name()}")

# Tạo model YOLOv8n mới
model = YOLO('yolov8n.pt')

# Cấu hình training
results = model.train(
    data='datasets/license_plate_ocr/dataset.yaml',
    epochs=100,
    imgsz=640,
    batch=16,
    name='LP_character_detector_v8',
    device='0' if torch.cuda.is_available() else 'cpu',
    # Augmentation parameters
    hsv_h=0.015,
    hsv_s=0.5,
    hsv_v=0.3,
    degrees=2.0,
    translate=0.1,
    scale=0.2,
    shear=0.0,
    perspective=0.0,
    flipud=0.01,
    fliplr=0.01,
    mosaic=0.8,
    mixup=0.1,
    copy_paste=0.1,
    # Training parameters
    patience=50,
    lr0=0.01,
    lrf=0.001,
    momentum=0.937,
    weight_decay=0.0005,
    warmup_epochs=5,
    box=7.5,
    cls=0.5,
    dfl=1.5
)