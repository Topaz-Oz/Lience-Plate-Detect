# Enable Docker BuildKit
$env:DOCKER_BUILDKIT = 1
$env:COMPOSE_DOCKER_CLI_BUILD = 1

Write-Host "🚀 Starting optimized build process..."

# Dừng và xóa containers cũ nếu có
Write-Host "Cleaning up old containers..."
docker-compose down --remove-orphans

# Build các images với cache và parallel
Write-Host "Building images with optimized caching..."
docker-compose build --parallel --build-arg BUILD_VERSION=1.0.0

# Tag images as latest
Write-Host "Tagging images..."
docker tag lpr-frontend:1.0.0 lpr-frontend:latest
docker tag lpr-backend:1.0.0 lpr-backend:latest
docker tag lpr-detection:1.0.0 lpr-detection:latest

Write-Host "Starting services..."
docker-compose up -d

# Kiểm tra health của các services
Write-Host "Checking service health..."
$maxAttempts = 30
$attempt = 0
$healthy = $false

while ($attempt -lt $maxAttempts -and -not $healthy) {
    $attempt++
    Write-Host "Health check attempt $attempt of $maxAttempts"
    
    $unhealthyServices = $(docker-compose ps --format json | ConvertFrom-Json | Where-Object { $_.State -ne "running" -or ($_.Health -and $_.Health -ne "healthy") })
    
    if ($unhealthyServices.Count -eq 0) {
        $healthy = $true
        Write-Host "✅ All services are healthy!"
        break
    }
    
    Write-Host "⏳ Waiting for services to be healthy..."
    Start-Sleep -Seconds 5
}

if (-not $healthy) {
    Write-Host "❌ Some services failed health check. Please check logs:"
    docker-compose logs
    exit 1
}

Write-Host @"

🎉 System is ready!
📱 Frontend: http://localhost:3000
🔍 API Documentation: http://localhost:3000/api-docs
💻 Health Dashboard: http://localhost:3000/health

To view logs: docker-compose logs -f
To stop: docker-compose down
"@
