# Save all current images to a tar file
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupDir = "docker-images-backup"

if (-not (Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir
}

Write-Host "💾 Saving current images to backup..."

# Save các images
$images = @(
    "lpr-frontend:latest",
    "lpr-backend:latest",
    "lpr-detection:latest"
)

foreach ($image in $images) {
    $filename = "$backupDir/$($image.Replace(':', '_'))_$timestamp.tar"
    Write-Host "Saving $image to $filename..."
    docker save -o $filename $image
}

Write-Host "✅ Images saved successfully to $backupDir"
Write-Host @"

To restore these images later, use:
.\restore-images.ps1

This will prevent rebuilding from scratch next time.
"@
