# Check if Docker is running
function Test-Docker {
    try {
        docker info | Out-Null
    }
    catch {
        Write-Error "Docker does not seem to be running, start it first and try again"
        exit 1
    }
}

# Function to clean up containers and volumes
function Clean-Environment {
    Write-Host "Cleaning up old containers and volumes..."
    docker-compose down -v
}

# Function to build and start services
function Start-Services {
    Write-Host "Building and starting services..."
    docker-compose up --build -d
}

# Main execution
Test-Docker
Clean-Environment
Start-Services

Write-Host "All services started successfully!"
