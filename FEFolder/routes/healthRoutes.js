const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Redis = require('ioredis');
const redis = new Redis({
    host: process.env.REDIS_HOST || 'redis',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD,
    retryStrategy: (times) => {
        const delay = Math.min(times * 200, 2000);
        return delay;
    },
    maxRetriesPerRequest: 3,
    enableOfflineQueue: true,
    connectTimeout: 10000
});

router.get('/health', async (req, res) => {
    try {
        // Check database connection
        const dbState = mongoose.connection.readyState;
        const dbHealth = dbState === 1 ? 'connected' : 'disconnected';

        // Check Redis connection
        let redisHealth = 'disconnected';
        try {
            await redis.ping();
            redisHealth = 'connected';
        } catch (e) {
            console.error('Redis health check failed:', e);
        }

        // Check license plate service
        let detectionServiceHealth = 'disconnected';
        try {
            const response = await fetch(`${process.env.DETECTION_SERVICE_URL}/health`);
            if (response.ok) {
                detectionServiceHealth = 'connected';
            }
        } catch (e) {
            console.error('Detection service health check failed:', e);
        }

        const isHealthy = dbHealth === 'connected' && 
                         redisHealth === 'connected' && 
                         detectionServiceHealth === 'connected';

        res.json({
            status: isHealthy ? 'healthy' : 'unhealthy',
            details: {
                database: dbHealth,
                cache: redisHealth,
                detectionService: detectionServiceHealth
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Health check failed:', error);
        res.status(500).json({
            status: 'unhealthy',
            error: error.message
        });
    }
});

module.exports = router;