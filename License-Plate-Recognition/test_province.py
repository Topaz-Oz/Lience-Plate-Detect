import sys
import os

# Thêm đường dẫn của thư mục function vào PYTHONPATH
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from function.helper import PlateLocation
import logging

# Thiết lập logging
logging.basicConfig(
    level=logging.INFO,
    format='%(message)s'
)

def test_province_recognition():
    # Test cases với nhiều loại biển số khác nhau
    test_plates = [
        "29B1-99999",  # Hà Nội - Công an
        "51F2-12345",  # TPHCM - Doanh nghiệp
        "43A1-23456",  # Đà Nẵng - Quân đội
        "92H1-78901",  # Quảng Nam - Doanh nghiệp
        "15K9-34567",  # Hải Phòng - Cơ quan
        "47X1-56789",  # Đắk Lắk - Xe máy
        "invalid",     # Test case không hợp lệ
        "99C-12345",   # Bắc Ninh - Chính phủ
        "34L1-56789",  # Hải Dương - Cá nhân
        "60P2-78901",  # Đồng Nai - Cá nhân
    ]

    print("\nKiểm tra nhận dạng tỉnh thành từ biển số xe:")
    print("=" * 50)
    
    for plate in test_plates:
        info = PlateLocation.parse_plate_info(plate)
        print(f"\nBiển số: {plate}")
        print(f"- Tỉnh/Thành phố: {info['province']}")
        print(f"- Loại xe: {info['type']}")
    
    print("\n" + "=" * 50)

if __name__ == "__main__":
    test_province_recognition()