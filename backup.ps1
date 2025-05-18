# Configuration
$BACKUP_DIR = ".\backups"
$MONGO_CONTAINER = "lpr-mongodb"
$TIMESTAMP = Get-Date -Format "yyyyMMdd_HHmmss"
$RETENTION_DAYS = 7

# Create backup directory structure
New-Item -Path "$BACKUP_DIR\mongodb" -ItemType Directory -Force | Out-Null
New-Item -Path "$BACKUP_DIR\uploads" -ItemType Directory -Force | Out-Null
New-Item -Path "$BACKUP_DIR\models" -ItemType Directory -Force | Out-Null

# MongoDB backup
Write-Host "Starting MongoDB backup..."
docker exec $MONGO_CONTAINER mongodump `
    --username=$env:MONGODB_USER `
    --password=$env:MONGODB_PASSWORD `
    --authenticationDatabase=admin `
    --archive > "$BACKUP_DIR\mongodb\mongo_$TIMESTAMP.archive"

# Backup uploads directory
Write-Host "Backing up uploads directory..."
Copy-Item -Path ".\FEFolder\uploads\*" -Destination "$BACKUP_DIR\uploads\$TIMESTAMP" -Recurse -Force

# Backup models
Write-Host "Backing up model files..."
Copy-Item -Path ".\License-Plate-Recognition\models\*" -Destination "$BACKUP_DIR\models\$TIMESTAMP" -Recurse -Force

# Cleanup old backups
Write-Host "Cleaning up old backups..."
Get-ChildItem -Path $BACKUP_DIR -Recurse | Where-Object {
    $_.LastWriteTime -lt (Get-Date).AddDays(-$RETENTION_DAYS)
} | Remove-Item -Force -Recurse

Write-Host "Backup completed successfully!"
