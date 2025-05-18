# License Plate Detection System

A robust license plate detection system using Docker and modern web technologies.

## Prerequisites

- Docker and Docker Compose
- PowerShell (for Windows users)
- Git

## Quick Start

1. Clone the repository:
```powershell
git clone https://github.com/Topaz-Oz/Lience-Plate-Detect.git; 
Set-Location -Path Lience-Plate-Detect
```

2. Create a `.env` file with required environment variables (see `.env.example`)

3. Build and start the system:

For optimized build:
```powershell
.\build-optimized.ps1
```

For development with rebuild:
```powershell
.\rebuild-system.ps1
```

The system will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## Architecture

The system consists of several Docker containers:
- Frontend (React.js)
- Backend API (Python)
- MongoDB
- Redis

## Features

- Real-time license plate detection
- Image processing and OCR
- Secure JWT authentication
- Optimized Docker builds
- Health monitoring

## Development

To rebuild individual services:

```powershell
docker-compose build <service-name>;
docker-compose up -d <service-name>
```

## Troubleshooting

If you encounter any issues:

1. Check container logs:
```powershell
docker-compose logs -f <service-name>
```

2. Ensure all required ports are available
3. Verify environment variables are set correctly

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to your branch
5. Create a Pull Request

## License

MIT License - see LICENSE file for details
