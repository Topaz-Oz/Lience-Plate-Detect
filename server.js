const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const path = require('path');
const http = require('http');
const WebSocketService = require('./FEFolder/services/websocketService');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// Initialize WebSocket service
const wsService = new WebSocketService(server);
app.set('wsService', wsService);

// CORS configuration
app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

app.use(express.json());

// Serve static files from FEFolder/public
app.use(express.static(path.join(__dirname, 'FEFolder/public')));

// Serve uploaded files
app.use('/uploads', express.static('uploads'));

// Create uploads directory if it doesn't exist
const fs = require('fs');
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

// Kết nối MongoDB
mongoose.connect('mongodb://127.0.0.1:27017/its_db')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Import controllers
const userController = require('./FEFolder/controllers/userController');
const authController = require('./FEFolder/controllers/authController');
const licensePlateController = require('./FEFolder/controllers/licensePlateController');
const recordController = require('./FEFolder/controllers/recordController');

// Import middleware
const auth = require('./FEFolder/middleware/auth');
const upload = require('./FEFolder/middleware/upload');

// Auth routes
app.post('/auth/google', authController.googleLogin);
app.post('/auth/logout', auth, authController.logout);
app.get('/auth/check', auth, authController.checkAuth);

// User routes
app.get('/users/me', auth, userController.getProfile);
app.patch('/users/me', auth, userController.updateProfile);
app.delete('/users/me', auth, userController.deleteAccount);
app.get('/users', auth, userController.getAllUsers);

// License plate detection routes
app.post('/detection/upload', auth, upload.single('image'), licensePlateController.detectPlate);
app.post('/detection/stream', auth, licensePlateController.detectFromStream);
app.post('/detection/save', auth, licensePlateController.saveDetection);
app.get('/detection/history', auth, licensePlateController.getHistory);

// Record management routes
app.get('/records', auth, recordController.getRecords);
app.get('/records/analytics', auth, recordController.getAnalytics);
app.patch('/records/:id/verify', auth, recordController.verifyDetection);
app.get('/records/location', auth, recordController.searchByLocation);
app.get('/records/export', auth, recordController.exportRecords);

// Serve index.html for all routes not matching API endpoints
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'FEFolder/public/login.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send({ error: 'Something went wrong!' });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});