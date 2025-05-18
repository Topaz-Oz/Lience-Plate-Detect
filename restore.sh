#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Configuration
BACKUP_DIR="./backups"
MONGO_CONTAINER="lpr-mongodb"

# Function to list available backups
list_backups() {
    echo -e "${YELLOW}Available MongoDB backups:${NC}"
    ls -1 ${BACKUP_DIR}/mongodb/
    echo -e "\n${YELLOW}Available uploads backups:${NC}"
    ls -1 ${BACKUP_DIR}/uploads/
    echo -e "\n${YELLOW}Available model backups:${NC}"
    ls -1 ${BACKUP_DIR}/models/
}

# Function to restore MongoDB
restore_mongodb() {
    local backup_file=$1
    if [ ! -f "${BACKUP_DIR}/mongodb/${backup_file}" ]; then
        echo -e "${RED}MongoDB backup file not found${NC}"
        exit 1
    }

    echo -e "${YELLOW}Restoring MongoDB from ${backup_file}...${NC}"
    docker exec -i ${MONGO_CONTAINER} mongorestore \
        --username=${MONGODB_USER} \
        --password=${MONGODB_PASSWORD} \
        --authenticationDatabase=admin \
        --archive < "${BACKUP_DIR}/mongodb/${backup_file}"
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}MongoDB restore completed successfully${NC}"
    else
        echo -e "${RED}MongoDB restore failed${NC}"
        exit 1
    fi
}

# Function to restore uploads
restore_uploads() {
    local backup_file=$1
    if [ ! -f "${BACKUP_DIR}/uploads/${backup_file}" ]; then
        echo -e "${RED}Uploads backup file not found${NC}"
        exit 1
    }

    echo -e "${YELLOW}Restoring uploads from ${backup_file}...${NC}"
    tar -xzf "${BACKUP_DIR}/uploads/${backup_file}" -C ./
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}Uploads restore completed successfully${NC}"
    else
        echo -e "${RED}Uploads restore failed${NC}"
        exit 1
    fi
}

# Function to restore ML models
restore_models() {
    local backup_file=$1
    if [ ! -f "${BACKUP_DIR}/models/${backup_file}" ]; then
        echo -e "${RED}Models backup file not found${NC}"
        exit 1
    }

    echo -e "${YELLOW}Restoring ML models from ${backup_file}...${NC}"
    tar -xzf "${BACKUP_DIR}/models/${backup_file}" -C ./License-Plate-Recognition/
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}Models restore completed successfully${NC}"
    else
        echo -e "${RED}Models restore failed${NC}"
        exit 1
    fi
}

# Main restore function
restore_all() {
    local timestamp=$1
    
    # Stop services before restore
    echo -e "${YELLOW}Stopping services...${NC}"
    docker-compose down
    
    # Restore each component
    restore_mongodb "mongo_${timestamp}.archive"
    restore_uploads "uploads_${timestamp}.tar.gz"
    restore_models "models_${timestamp}.tar.gz"
    
    # Restart services
    echo -e "${YELLOW}Restarting services...${NC}"
    docker-compose up -d
    
    echo -e "${GREEN}Restore completed successfully!${NC}"
}

# Parse command line arguments
case "$1" in
    "list")
        list_backups
        ;;
    "mongodb")
        restore_mongodb "$2"
        ;;
    "uploads")
        restore_uploads "$2"
        ;;
    "models")
        restore_models "$2"
        ;;
    "all")
        if [ -z "$2" ]; then
            echo "Usage: $0 all <timestamp>"
            exit 1
        fi
        restore_all "$2"
        ;;
    *)
        echo "Usage: $0 {list|mongodb|uploads|models|all} [backup_file]"
        exit 1
        ;;
esac