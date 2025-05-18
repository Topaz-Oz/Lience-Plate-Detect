const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const zlib = require('zlib');

class WebSocketService {
    constructor() {
        this.io = null;
        this.connectedUsers = new Map();
    }    initialize(server) {
        this.io = new Server(server, {
            cors: {
                origin: process.env.FRONTEND_URL || 'http://localhost:3001',
                methods: ['GET', 'POST'],
                credentials: true
            },
            pingTimeout: 30000,
            pingInterval: 10000,
            transports: ['websocket'],
            maxHttpBufferSize: 1e6, // 1MB
            connectTimeout: 45000
        });

        // Add authentication middleware
        this.io.use((socket, next) => {
            try {
                const token = socket.handshake.auth.token;
                if (!token) {
                    return next(new Error('Authentication token missing'));
                }

                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                socket.userId = decoded.userId;
                this.connectedUsers.set(decoded.userId, socket.id);
                next();
            } catch (error) {
                logger.error('WebSocket authentication error:', error);
                next(new Error('Authentication failed'));
            }
        });

        this.io.on('connection', (socket) => {
            logger.info(`Client connected: ${socket.id}, User: ${socket.userId}`);

            socket.on('disconnect', () => {
                logger.info(`Client disconnected: ${socket.id}`);
                this.connectedUsers.delete(socket.userId);
            });

            socket.on('error', (error) => {
                logger.error(`Socket error for client ${socket.id}:`, error);
            });
        });

        logger.info('WebSocket service initialized');
    }

    cleanup() {
        if (this.io) {
            this.io.close();
            this.connectedUsers.clear();
            logger.info('WebSocket connections closed');
        }
    }

    // Send detection progress updates to specific user
    sendDetectionProgress(userId, data) {
        try {
            if (!this.io) return;

            const socketId = this.connectedUsers.get(userId);
            if (socketId) {
                this.io.to(socketId).emit('detection', {
                    type: 'progress',
                    data
                });
            }
        } catch (error) {
            logger.error('Error sending detection progress:', error);
        }
    }

    // Broadcast new detection to all connected clients
    broadcastNewDetection(detection) {
        try {
            if (!this.io) return;

            this.io.emit('detection', {
                type: 'detection',
                data: detection
            });
        } catch (error) {
            logger.error('Error broadcasting detection:', error);
        }
    }

    // Send detection verification status update
    broadcastDetectionUpdate(detectionId, update) {
        try {
            if (!this.io) return;

            this.io.emit('detection', {
                type: 'update',
                data: { id: detectionId, ...update }
            });
        } catch (error) {
            logger.error('Error broadcasting detection update:', error);
        }
    }

    // Add video stream compression
    compressVideoFrame(frame) {
        return new Promise((resolve, reject) => {
            zlib.deflate(frame, (err, compressed) => {
                if (err) {
                    logger.error('Video frame compression error:', err);
                    reject(err);
                    return;
                }
                resolve(compressed);
            });
        });
    }

    decompressVideoFrame(compressedFrame) {
        return new Promise((resolve, reject) => {
            zlib.inflate(compressedFrame, (err, decompressed) => {
                if (err) {
                    logger.error('Video frame decompression error:', err);
                    reject(err);
                    return;
                }
                resolve(decompressed);
            });
        });
    }

    async sendVideoFrame(userId, frame) {
        try {
            if (!this.io) return;

            const socketId = this.connectedUsers.get(userId);
            if (socketId) {
                const compressedFrame = await this.compressVideoFrame(frame);
                this.io.to(socketId).emit('videoFrame', compressedFrame);
            }
        } catch (error) {
            logger.error('Error sending video frame:', error);
        }
    }
}

module.exports = WebSocketService;