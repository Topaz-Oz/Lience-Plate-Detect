require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
const logger = require('./utils/logger');
const { errorHandler } = require('./middleware/error');
const { apiLimiter, authLimiter } = require('./middleware/rateLimit');
const WebSocketService = require('./services/websocket');
const fileCleanup = require('./services/fileCleanup');
const RedisManager = require('./services/redis');

const redisManager = new RedisManager();
let redisClient;

// Initialize Redis
(async () => {
    try {
        redisClient = await redisManager.connect();
        logger.info('Redis initialized successfully');
    } catch (error) {
        logger.error('Failed to initialize Redis:', error);
    }
})();

// Routes
const userRoutes = require('./routes/userRoutes');
const authRoutes = require('./routes/authRoutes');
const detectionRoutes = require('./routes/detectionRoutes');

const app = express();

// Basic middleware
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false
}));

// Configure CORS
app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:3001', 'https://accounts.google.com'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'Accept'],
    exposedHeaders: ['Content-Range', 'X-Content-Range']
}));

// Enable compression
app.use(compression({
    level: 6, // compression level
    threshold: 10 * 1024, // only compress responses > 10KB
    filter: (req, res) => {
        if (req.headers['x-no-compression']) {
            return false;
        }
        return compression.filter(req, res);
    }
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static file serving
const uploadsDir = path.join(__dirname, 'uploads');
if (!require('fs').existsSync(uploadsDir)) {
    require('fs').mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// Health check endpoint
app.get('/health', async (req, res) => {
    try {
        // Check database connection
        if (mongoose.connection.readyState !== 1) {
            throw new Error('Database not connected');
        }
        
        // Check Redis connection if available
        if (redisClient && redisClient.isOpen) {
            await redisClient.ping();
        }
        
        res.status(200).json({ status: 'healthy' });
    } catch (error) {
        logger.error('Health check failed:', error);
        res.status(500).json({
            status: 'unhealthy',
            error: error.message
        });
    }
});

// Routes with rate limiting
app.use('/api', apiLimiter);
app.use('/auth', authLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/detection', detectionRoutes);

// Error handling must be last
app.use(errorHandler);

// MongoDB connection với retry logic
const connectDB = async (retries = 5) => {
    for (let i = 0; i < retries; i++) {
        try {
            await mongoose.connect(process.env.MONGODB_URI, {
                useNewUrlParser: true,
                useUnifiedTopology: true,
                serverSelectionTimeoutMS: 5000,
                socketTimeoutMS: 45000,
                connectTimeoutMS: 10000,
                heartbeatFrequencyMS: 30000
            });
            logger.info('Connected to MongoDB');
            break;
        } catch (err) {
            logger.error(`MongoDB connection attempt ${i + 1} failed:`, err);
            if (i === retries - 1) throw err;
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }
};

// Start server
const startServer = async () => {
    try {
        await connectDB();

        const PORT = 3000; // Use fixed port 3000 as specified in docker-compose
        const server = app.listen(PORT, '0.0.0.0', () => {
            logger.info(`Server is running on port ${PORT}`);
        });

        server.on('error', (error) => {
            if (error.code === 'EADDRINUSE') {
                logger.error(`Port ${PORT} is already in use`);
            } else {
                logger.error('Server error:', error);
            }
            process.exit(1);
        });

        // Initialize WebSocket service
        const wsService = new WebSocketService();
        wsService.initialize(server);
        app.set('wsService', wsService);

        // Start file cleanup service
        fileCleanup.start();

        // Graceful shutdown
        const cleanup = async (signal) => {
            logger.info(`Received ${signal}. Starting graceful shutdown...`);

            // Đóng file cleanup service
            try {
                fileCleanup.stop();
                logger.info('File cleanup service stopped');
            } catch (error) {
                logger.error('Error stopping file cleanup service:', error);
            }

            // Đóng WebSocket connections
            if (wsService) {
                wsService.cleanup();
                logger.info('WebSocket connections closed');
            }

            // Đóng HTTP server
            server.close(() => {
                logger.info('HTTP server closed');
            });

            // Đóng MongoDB connection
            try {
                await mongoose.connection.close();
                logger.info('MongoDB connection closed');
            } catch (err) {
                logger.error('Error closing MongoDB connection:', err);
            }

            process.exit(0);
        };

        // Register shutdown handlers
        process.on('SIGTERM', () => cleanup('SIGTERM'));
        process.on('SIGINT', () => cleanup('SIGINT'));

    } catch (error) {
        logger.error('Server startup error:', error);
        process.exit(1);
    }
};

startServer();
