#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Configuration
MONGO_CONTAINER="lpr-mongodb"
BACKUP_DIR="./backups/migrations"
MIGRATION_DIR="./migrations"
VERSION_FILE=".version"

# Function to get current version
get_current_version() {
    if [ -f "$VERSION_FILE" ]; then
        cat "$VERSION_FILE"
    else
        echo "0.0.0"
    fi
}

# Function to backup before migration
backup_before_migration() {
    local current_version=$1
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_path="${BACKUP_DIR}/pre_migration_${current_version}_${timestamp}"
    
    echo -e "${YELLOW}Creating backup before migration...${NC}"
    
    # Create backup directory
    mkdir -p "$backup_path"
    
    # Backup MongoDB
    docker exec ${MONGO_CONTAINER} mongodump \
        --username=${MONGODB_USER} \
        --password=${MONGODB_PASSWORD} \
        --authenticationDatabase=admin \
        --archive > "${backup_path}/mongodb.archive"
    
    # Backup model files
    if [ -d "License-Plate-Recognition/model" ]; then
        cp -r License-Plate-Recognition/model "${backup_path}/models"
    fi
    
    echo -e "${GREEN}Backup created at: ${backup_path}${NC}"
}

# Function to run MongoDB migrations
run_mongodb_migrations() {
    local target_version=$1
    local migrations_path="${MIGRATION_DIR}/mongodb"
    
    echo -e "${YELLOW}Running MongoDB migrations...${NC}"
    
    for migration in $(ls ${migrations_path}/*.js | sort -V); do
        local migration_version=$(basename "$migration" .js | cut -d'_' -f1)
        if [[ "$migration_version" > "$current_version" ]] && [[ "$migration_version" <= "$target_version" ]]; then
            echo "Applying migration: $(basename $migration)"
            docker exec -i ${MONGO_CONTAINER} mongosh \
                --username=${MONGODB_USER} \
                --password=${MONGODB_PASSWORD} \
                --authenticationDatabase=admin \
                lpr < "$migration"
        fi
    done
}

# Function to update ML models
update_models() {
    local target_version=$1
    local models_path="${MIGRATION_DIR}/models"
    
    echo -e "${YELLOW}Updating ML models...${NC}"
    
    if [ -d "${models_path}/${target_version}" ]; then
        cp -r "${models_path}/${target_version}"/* License-Plate-Recognition/model/
        echo -e "${GREEN}Updated models to version ${target_version}${NC}"
    else
        echo -e "${YELLOW}No model updates found for version ${target_version}${NC}"
    fi
}

# Function to validate migration
validate_migration() {
    echo -e "${YELLOW}Validating migration...${NC}"
    
    # Check MongoDB connection
    if ! docker exec ${MONGO_CONTAINER} mongosh \
        --username=${MONGODB_USER} \
        --password=${MONGODB_PASSWORD} \
        --authenticationDatabase=admin \
        --eval "db.adminCommand('ping')" > /dev/null; then
        echo -e "${RED}MongoDB validation failed${NC}"
        return 1
    fi
    
    # Check model files
    required_models=("LP_detector_nano_61.pt" "LP_ocr_nano_62.pt")
    for model in "${required_models[@]}"; do
        if [ ! -f "License-Plate-Recognition/model/${model}" ]; then
            echo -e "${RED}Model file ${model} is missing${NC}"
            return 1
        fi
    done
    
    echo -e "${GREEN}Migration validation passed${NC}"
    return 0
}

# Main migration function
migrate() {
    local target_version=$1
    current_version=$(get_current_version)
    
    if [ "$target_version" == "$current_version" ]; then
        echo -e "${GREEN}Already at version ${target_version}${NC}"
        exit 0
    fi
    
    echo -e "${YELLOW}Starting migration from ${current_version} to ${target_version}${NC}"
    
    # Create backup
    backup_before_migration "$current_version"
    
    # Stop services except MongoDB
    docker-compose stop frontend backend license-plate-service
    
    # Run migrations
    run_mongodb_migrations "$target_version"
    update_models "$target_version"
    
    # Validate migration
    if ! validate_migration; then
        echo -e "${RED}Migration validation failed. Rolling back...${NC}"
        ./restore.sh "pre_migration_${current_version}"
        exit 1
    fi
    
    # Update version file
    echo "$target_version" > "$VERSION_FILE"
    
    # Restart services
    docker-compose up -d
    
    echo -e "${GREEN}Migration to version ${target_version} completed successfully${NC}"
}

# Parse command line arguments
case "$1" in
    "list")
        echo "Available versions:"
        ls -1 "$MIGRATION_DIR/versions"
        ;;
    "current")
        echo "Current version: $(get_current_version)"
        ;;
    "migrate")
        if [ -z "$2" ]; then
            echo "Usage: $0 migrate <target_version>"
            exit 1
        fi
        migrate "$2"
        ;;
    *)
        echo "Usage: $0 {list|current|migrate <target_version>}"
        exit 1
        ;;
esac