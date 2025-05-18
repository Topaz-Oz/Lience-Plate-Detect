#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Configuration
UPLOADS_DIR="./uploads"
LOGS_DIR="./logs"
MODEL_DIR="./License-Plate-Recognition/model"
DATA_DIR="./data"

# User and group IDs
APP_USER=1000
APP_GROUP=1000

# Function to secure directory permissions
secure_directory() {
    local dir=$1
    local permission=${2:-755}
    
    echo -e "${YELLOW}Securing directory: $dir${NC}"
    
    if [ ! -d "$dir" ]; then
        mkdir -p "$dir"
    fi
    
    chmod -R "$permission" "$dir"
    chown -R $APP_USER:$APP_GROUP "$dir"
    
    echo -e "${GREEN}✓ Secured $dir${NC}"
}

# Function to secure sensitive files
secure_sensitive_files() {
    local files=(".env" "redis.conf" "mongo-init.js")
    
    echo -e "${YELLOW}Securing sensitive files...${NC}"
    
    for file in "${files[@]}"; do
        if [ -f "$file" ]; then
            chmod 600 "$file"
            chown $APP_USER:$APP_GROUP "$file"
            echo -e "${GREEN}✓ Secured $file${NC}"
        else
            echo -e "${RED}✗ File not found: $file${NC}"
        fi
    done
}

# Function to set SSL certificate permissions
secure_ssl() {
    local ssl_dir="./ssl"
    
    if [ -d "$ssl_dir" ]; then
        echo -e "${YELLOW}Securing SSL certificates...${NC}"
        chmod -R 600 "$ssl_dir"/*.key
        chmod -R 644 "$ssl_dir"/*.crt
        chmod -R 644 "$ssl_dir"/*.pem
        chown -R $APP_USER:$APP_GROUP "$ssl_dir"
        echo -e "${GREEN}✓ Secured SSL certificates${NC}"
    fi
}

# Function to verify permissions
verify_permissions() {
    echo -e "${YELLOW}Verifying permissions...${NC}"
    
    local directories=("$UPLOADS_DIR" "$LOGS_DIR" "$MODEL_DIR" "$DATA_DIR")
    
    for dir in "${directories[@]}"; do
        if [ -d "$dir" ]; then
            ls -la "$dir"
        else
            echo -e "${RED}✗ Directory not found: $dir${NC}"
        fi
    done
}

# Main execution
echo "Setting up secure permissions..."

# Secure main directories
secure_directory "$UPLOADS_DIR" 755
secure_directory "$LOGS_DIR" 755
secure_directory "$MODEL_DIR" 750
secure_directory "$DATA_DIR" 750

# Secure sensitive files
secure_sensitive_files

# Secure SSL certificates if they exist
secure_ssl

# Verify all permissions
verify_permissions

echo -e "${GREEN}Permission setup completed!${NC}"