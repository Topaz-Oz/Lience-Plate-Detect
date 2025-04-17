from ultralytics import YOLO
import torch
import os

# Initialize YOLOv8 model
model = YOLO('yolov8n.pt')  # load pretrained model

# Configure training
results = model.train(
    data='datasets/license_plate_ocr/dataset.yaml',
    epochs=100,
    imgsz=640,
    batch=8,  # Reduced batch size for CPU
    device='cpu',  # Force CPU usage
    name='LP_character_detector_v8',
    # Augmentation parameters optimized for CPU
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
    mosaic=0.5,  # Reduced mosaic aug for CPU
    mixup=0.0,   # Disabled mixup for CPU
    copy_paste=0.0,  # Disabled copy-paste for CPU
    # Training parameters
    warmup_epochs=3,
    patience=20,
    lr0=0.01,
    lrf=0.001,
    momentum=0.937,
    weight_decay=0.0005,
    # Loss gains
    box=7.5,
    cls=0.5,
    dfl=1.5,
    # Save and validation
    save_period=10,  # Save checkpoint every 10 epochs
    cache=True,  # Cache images for faster training
    workers=1  # Reduced number of workers for CPU
)

# Validate model
metrics = model.val()