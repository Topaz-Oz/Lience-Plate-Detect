# Restore Docker images from backup
$backupDir = "docker-images-backup"

if (-not (Test-Path $backupDir)) {
    Write-Host "❌ No backup directory found at $backupDir"
    exit 1
}

Write-Host "🔄 Restoring Docker images from backup..."

# Get latest backups for each image
$patterns = @(
    "lpr-frontend_latest*.tar",
    "lpr-backend_latest*.tar",
    "lpr-detection_latest*.tar"
)

foreach ($pattern in $patterns) {
    $latest = Get-ChildItem -Path $backupDir -Filter $pattern | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if ($latest) {
        Write-Host "Loading $($latest.Name)..."
        docker load -i $latest.FullName
    }
}

Write-Host "✅ Images restored successfully"
Write-Host @"

You can now run the system with:
docker-compose up -d

The system will use the restored images instead of rebuilding.
"@
