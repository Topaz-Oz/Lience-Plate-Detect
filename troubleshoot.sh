#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Function to check system requirements
check_system_requirements() {
    echo -e "${YELLOW}Checking system requirements...${NC}"
    
    # Check CPU cores
    cpu_cores=$(nproc)
    echo "CPU Cores: $cpu_cores"
    [[ $cpu_cores -lt 2 ]] && echo -e "${RED}Warning: At least 2 CPU cores recommended${NC}"
    
    # Check available memory
    total_mem=$(free -g | awk '/^Mem:/{print $2}')
    echo "Total Memory: ${total_mem}GB"
    [[ $total_mem -lt 4 ]] && echo -e "${RED}Warning: At least 4GB RAM recommended${NC}"
    
    # Check disk space
    free_space=$(df -h . | awk 'NR==2 {print $4}')
    echo "Free Disk Space: $free_space"
    
    # Check Docker version
    docker_version=$(docker --version)
    echo "Docker Version: $docker_version"
    
    # Check Docker Compose version
    compose_version=$(docker-compose --version)
    echo "Docker Compose Version: $compose_version"
}

# Function to check container health
check_containers() {
    echo -e "\n${YELLOW}Checking container status...${NC}"
    docker-compose ps
    
    echo -e "\n${YELLOW}Container resource usage:${NC}"
    docker stats --no-stream
}

# Function to check logs for errors
check_logs() {
    echo -e "\n${YELLOW}Checking service logs for errors...${NC}"
    
    services=("frontend" "backend" "license-plate-service" "mongodb" "redis")
    
    for service in "${services[@]}"; do
        echo -e "\n${YELLOW}Recent errors in $service logs:${NC}"
        docker-compose logs --tail=100 $service | grep -i "error"
    done
}

# Function to check network connectivity
check_network() {
    echo -e "\n${YELLOW}Checking network connectivity...${NC}"
    
    # Check internal network
    echo "Internal network connectivity:"
    docker network inspect lpr-network
    
    # Check service connectivity
    services=("frontend:80" "backend:3000" "license-plate-service:5000" "mongodb:27017" "redis:6379")
    
    for service in "${services[@]}"; do
        IFS=':' read -r -a array <<< "$service"
        name="${array[0]}"
        port="${array[1]}"
        
        echo "Checking $name on port $port..."
        docker-compose exec $name nc -zv localhost $port
    done
}

# Function to check model status
check_models() {
    echo -e "\n${YELLOW}Checking ML models...${NC}"
    
    models_dir="License-Plate-Recognition/model"
    required_models=("LP_detector_nano_61.pt" "LP_ocr_nano_62.pt")
    
    for model in "${required_models[@]}"; do
        if [ -f "$models_dir/$model" ]; then
            size=$(ls -lh "$models_dir/$model" | awk '{print $5}')
            echo -e "${GREEN}✓ $model (Size: $size)${NC}"
        else
            echo -e "${RED}✗ $model not found${NC}"
        fi
    done
}

# Function to verify environment variables
check_env() {
    echo -e "\n${YELLOW}Verifying environment variables...${NC}"
    
    if [ ! -f .env ]; then
        echo -e "${RED}Error: .env file not found${NC}"
        return 1
    }
    
    required_vars=(
        "MONGODB_USER"
        "MONGODB_PASSWORD"
        "REDIS_PASSWORD"
        "JWT_SECRET"
        "BUILD_VERSION"
    )
    
    for var in "${required_vars[@]}"; do
        if grep -q "^${var}=" .env; then
            echo -e "${GREEN}✓ $var is set${NC}"
        else
            echo -e "${RED}✗ $var is missing${NC}"
        fi
    done
}

# Function to run diagnostics
run_diagnostics() {
    check_system_requirements
    check_env
    check_containers
    check_network
    check_models
    check_logs
}

# Function to fix common issues
fix_common_issues() {
    echo -e "\n${YELLOW}Attempting to fix common issues...${NC}"
    
    # Reset Docker network
    echo "Resetting Docker network..."
    docker-compose down
    docker network prune -f
    
    # Clear Docker cache
    echo "Clearing Docker cache..."
    docker system prune -f
    
    # Recreate volumes
    echo "Recreating volumes..."
    docker-compose down -v
    
    # Rebuild and restart services
    echo "Rebuilding and restarting services..."
    docker-compose up -d --build
}

# Parse command line arguments
case "$1" in
    "check")
        run_diagnostics
        ;;
    "fix")
        fix_common_issues
        ;;
    "logs")
        check_logs
        ;;
    "network")
        check_network
        ;;
    "models")
        check_models
        ;;
    *)
        echo "Usage: $0 {check|fix|logs|network|models}"
        exit 1
        ;;
esac