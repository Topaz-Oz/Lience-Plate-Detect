# Clean everything and rebuild script
Write-Host "🧹 Cleaning up Docker system..."

# Stop and remove all containers
Write-Host "Stopping all containers..."
docker-compose down --remove-orphans

# Remove all related images
Write-Host "Removing all project images..."
docker rmi lpr-frontend:latest lpr-backend:latest lpr-detection:latest -f
docker rmi $(docker images -q lpr-frontend:* lpr-backend:* lpr-detection:*) -f

# Clean Docker system
Write-Host "Cleaning Docker system..."
docker system prune -af --volumes

# Verify clean state
Write-Host "Current Docker state:"
docker ps -a
docker images

Write-Host "🏗️ Rebuilding system from scratch..."

# Enable BuildKit and Docker Compose features
$env:DOCKER_BUILDKIT=1
$env:COMPOSE_DOCKER_CLI_BUILD=1
$env:COMPOSE_BAKE=true
$env:BUILDKIT_PROGRESS="plain"

# Pull base images first
Write-Host "Pulling base images..."
docker pull node:18-slim
docker pull nginx:alpine
docker pull redis:alpine
docker pull mongo:latest

# Build and start services
Write-Host "Building and starting services..."
docker-compose up --build -d

# Monitor startup
Write-Host "Monitoring service startup..."
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
    Write-Host "❌ Some services failed to start. Displaying logs..."
    docker-compose logs
    exit 1
}

Write-Host @"

🎉 System successfully rebuilt!
📊 System Status:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- License Plate Service: http://localhost:5000
- MongoDB: localhost:27017
- Redis: localhost:6379

To view logs: docker-compose logs -f
To stop: docker-compose down
"@
