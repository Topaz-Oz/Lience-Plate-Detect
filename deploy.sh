#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Function to check if Docker is running
check_docker() {
    if ! docker info >/dev/null 2>&1; then
        echo -e "${RED}Docker is not running. Please start Docker first.${NC}"
        exit 1
    fi
}

# Function to validate environment variables
validate_env() {
    if [ ! -f .env ]; then
        echo -e "${RED}Error: .env file not found${NC}"
        exit 1
    fi
    
    required_vars=(
        "MONGODB_USER"
        "MONGODB_PASSWORD"
        "REDIS_PASSWORD"
        "JWT_SECRET"
    )
    
    for var in "${required_vars[@]}"; do
        if ! grep -q "^${var}=" .env; then
            echo -e "${RED}Error: ${var} is not set in .env file${NC}"
            exit 1
        fi
    done
}

# Function to check service health
check_health() {
    local service=$1
    local max_retries=30
    local retry_interval=10
    
    echo -e "${YELLOW}Checking health of ${service}...${NC}"
    
    for ((i=1; i<=max_retries; i++)); do
        if curl -s "http://localhost:${PORT:-80}/health" >/dev/null; then
            echo -e "${GREEN}${service} is healthy!${NC}"
            return 0
        fi
        echo -n "."
        sleep $retry_interval
    done
    
    echo -e "${RED}${service} failed health check${NC}"
    return 1
}

# Function for rolling update
rolling_update() {
    local service=$1
    echo -e "${YELLOW}Performing rolling update for ${service}...${NC}"
    
    # Pull new images if they exist
    docker-compose pull $service || true
    
    # Update service with zero downtime
    docker-compose up -d --no-deps --scale $service=2 --no-recreate $service
    
    # Wait for new containers to be healthy
    sleep 10
    check_health $service || {
        echo -e "${RED}Rolling update failed for ${service}${NC}"
        docker-compose logs $service
        exit 1
    }
    
    # Remove old containers
    docker-compose up -d --no-deps --scale $service=1 --no-recreate $service
}

# Main deployment function
deploy() {
    echo -e "${YELLOW}Starting deployment process...${NC}"
    
    # Validate environment and Docker
    validate_env
    check_docker
    
    # Create necessary directories
    mkdir -p logs uploads
    
    # Build and deploy services
    echo -e "${YELLOW}Building and deploying services...${NC}"
    docker-compose build --parallel
    
    # Start infrastructure services first
    docker-compose up -d mongodb redis
    sleep 15  # Wait for databases to initialize
    
    # Start application services with rolling updates
    for service in license-plate-service backend frontend; do
        rolling_update $service
    done
    
    # Final health check
    for service in frontend backend license-plate-service; do
        check_health $service || {
            echo -e "${RED}Deployment failed at final health check${NC}"
            exit 1
        }
    done
    
    echo -e "${GREEN}Deployment completed successfully!${NC}"
    echo -e "${GREEN}You can access the application at http://localhost${NC}"
}

# Cleanup function
cleanup() {
    echo -e "${YELLOW}Cleaning up old resources...${NC}"
    docker-compose down -v --remove-orphans
    docker system prune -f
}

# Parse command line arguments
case "$1" in
    "deploy")
        deploy
        ;;
    "update")
        rolling_update $2
        ;;
    "cleanup")
        cleanup
        ;;
    *)
        echo "Usage: $0 {deploy|update|cleanup}"
        exit 1
        ;;
esac