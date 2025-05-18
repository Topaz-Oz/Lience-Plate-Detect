#!/bin/bash

# Configuration
BACKUP_DIR="./backups"
MONGO_CONTAINER="lpr-mongodb"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=7

# Create backup directory structure
mkdir -p "${BACKUP_DIR}/mongodb"
mkdir -p "${BACKUP_DIR}/uploads"
mkdir -p "${BACKUP_DIR}/models"

# MongoDB backup
echo "Starting MongoDB backup..."
docker exec ${MONGO_CONTAINER} mongodump \
    --username=${MONGODB_USER} \
    --password=${MONGODB_PASSWORD} \
    --authenticationDatabase=admin \
    --archive > "${BACKUP_DIR}/mongodb/mongo_${TIMESTAMP}.archive"

# Uploads backup
echo "Backing up uploads..."
tar -czf "${BACKUP_DIR}/uploads/uploads_${TIMESTAMP}.tar.gz" ./uploads/

# ML Models backup
echo "Backing up ML models..."
tar -czf "${BACKUP_DIR}/models/models_${TIMESTAMP}.tar.gz" ./License-Plate-Recognition/model/

# Cleanup old backups
echo "Cleaning up old backups..."
find "${BACKUP_DIR}" -type f -mtime +${RETENTION_DAYS} -exec rm {} \;

echo "Backup completed successfully!"
echo "Backup files:"
echo "- MongoDB: ${BACKUP_DIR}/mongodb/mongo_${TIMESTAMP}.archive"
echo "- Uploads: ${BACKUP_DIR}/uploads/uploads_${TIMESTAMP}.tar.gz"
echo "- Models: ${BACKUP_DIR}/models/models_${TIMESTAMP}.tar.gz"