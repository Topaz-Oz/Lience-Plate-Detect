# syntax=docker/dockerfile:1.3

FROM python:3.9-slim

# Set work directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    libglib2.0-0 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies with cache
COPY requirements.txt .

RUN --mount=type=cache,target=/root/.cache/pip \
    pip install --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt \
        --timeout 1800 \
        --retries 5 \
        --prefer-binary \
        --no-deps torch torchvision \
    && pip install --no-cache-dir -r requirements.txt

# Copy the full application
COPY . .

# Create folders if not exist
RUN mkdir -p models uploads

# Environment settings
ENV PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app \
    FLASK_APP=core/lp_image.py \
    FLASK_ENV=production

# Expose Flask port
EXPOSE 5000

# Run Flask app
CMD ["python", "-m", "flask", "run", "--host=0.0.0.0"]
