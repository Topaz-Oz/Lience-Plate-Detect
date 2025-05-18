# Enable BuildKit
$env:DOCKER_BUILDKIT=1
$env:COMPOSE_DOCKER_CLI_BUILD=1

# Pull existing images for cache
docker-compose pull

# Build images with cache
docker-compose build --parallel

# Tag latest images
docker tag lpr-frontend:${env:BUILD_VERSION:-1.0.0} lpr-frontend:latest
docker tag lpr-backend:${env:BUILD_VERSION:-1.0.0} lpr-backend:latest
docker tag lpr-detection:${env:BUILD_VERSION:-1.0.0} lpr-detection:latest

# Push images if needed
if ($env:PUSH_IMAGES -eq "true") {
    docker-compose push
}

# Start services
docker-compose up -d
