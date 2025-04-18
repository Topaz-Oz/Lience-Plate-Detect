import os
from pathlib import Path
from function.helper import process_label_file
import shutil

def convert_dataset_labels(base_path):
    # Create backup of original labels
    labels_dir = Path(base_path) / 'labels'
    backup_dir = Path(base_path) / 'labels_backup'
    
    if not backup_dir.exists():
        shutil.copytree(labels_dir, backup_dir)
        print(f"Created backup of labels in {backup_dir}")
    
    # Process train and val folders
    for split in ['train', 'val']:
        split_dir = labels_dir / split
        if not split_dir.exists():
            continue
            
        print(f"Processing {split} labels...")
        for label_file in split_dir.glob('*.txt'):
            temp_file = label_file.parent / f"temp_{label_file.name}"
            process_label_file(str(label_file), str(temp_file))
            # Replace original with converted file
            os.replace(str(temp_file), str(label_file))
        
        print(f"Finished processing {split} labels")

if __name__ == "__main__":
    base_path = Path(__file__).parent
    convert_dataset_labels(base_path)
    print("Label conversion complete!")