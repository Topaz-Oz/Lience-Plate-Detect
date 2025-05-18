# License Plate Recognition Frontend

This is the frontend application for the License Plate Recognition system, built with React, TypeScript, and Material-UI.

## Features

- Real-time license plate detection
- Image upload and preview
- Detection history with filtering
- User authentication
- Responsive design

## Prerequisites

- Node.js 14.x or higher
- npm 6.x or higher

## Setup

1. Install dependencies:
```powershell
npm install
```

2. Create a `.env` file in the root directory with:
```
REACT_APP_API_URL=http://localhost:3000
REACT_APP_WS_URL=ws://localhost:3000
```

3. Start the development server:
```powershell
npm start
```

## Available Scripts

- `npm start`: Runs the app in development mode
- `npm test`: Runs the test suite
- `npm run build`: Builds the app for production
- `npm run eject`: Ejects from Create React App

## Project Structure

```
src/
  ├── components/     # Reusable components
  ├── contexts/      # React contexts (auth, etc.)
  ├── pages/         # Main page components
  ├── services/      # API and WebSocket services
  ├── types/         # TypeScript type definitions
  ├── utils/         # Utility functions
  └── App.tsx        # Root component
```

## Environment Variables

- `REACT_APP_API_URL`: Backend API URL
- `REACT_APP_WS_URL`: WebSocket server URL

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request