    #!/bin/bash

# Function to check if Docker is running
check_docker() {
    if ! docker info >/dev/null 2>&1; then
        echo "Docker does not seem to be running, start it first and try again"
        exit 1
    fi
}

# Function to clean up containers and volumes
cleanup() {
    echo "Cleaning up old containers and volumes..."
    docker-compose down -v
}

# Function to build and start services
start_services() {
    echo "Building and starting services..."
    docker-compose up --build -d

    # Wait for services to be ready
    echo "Waiting for services to be ready..."
    sleep 10

    # Check services health
    if [ "$(docker-compose ps | grep -c "Up")" -eq "5" ]; then
        echo "All services are up and running!"
        echo "Access the application at http://localhost"
    else
        echo "Some services failed to start. Check logs with: docker-compose logs"
    fi
}

# Main script
echo "License Plate Recognition System"
echo "--------------------------------"

# Check Docker
check_docker

# Clean up
cleanup

# Start services
start_services

# Show logs
echo "Showing logs (Ctrl+C to exit)..."
docker-compose logs -f