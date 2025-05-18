const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const Redis = require('ioredis');
const logger = require('../utils/logger');
const { MemoryStore } = require('express-rate-limit'); 

let store;

if (process.env.REDIS_URL) {
    const redisClient = new Redis(process.env.REDIS_URL, {
        enableOfflineQueue: true,
        retryStrategy: (times) => {
            if (times > 10) {
                logger.error('Max Redis connection retries reached, using memory store');
                return null;
            }
            return Math.min(times * 200, 2000);
        },
        maxRetriesPerRequest: 3,
        connectTimeout: 10000,
        lazyConnect: true
    });

    redisClient.on('error', (err) => {
        logger.error('Redis error:', err);
    });

    redisClient.on('connect', () => {
        logger.info('Successfully connected to Redis');
    });

    store = new RedisStore({
        sendCommand: (...args) => redisClient.call(...args),
        resetExpiryOnChange: true
    });
} else {
    store = new MemoryStore(); 
}

// General API rate limiter
const apiLimiter = rateLimit({
    store: store,
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again after 15 minutes',
    standardHeaders: true,
    legacyHeaders: false
});

// Stricter rate limiter for auth routes
const authLimiter = rateLimit({
    store: store,
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // Limit each IP to 5 login attempts per hour
    message: 'Too many login attempts from this IP, please try again after an hour',
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true // Chỉ tính các requests thất bại
});

// Rate limit cho upload ảnh
const uploadLimiter = rateLimit({
    store: store,
    windowMs: 60 * 60 * 1000, // 1 giờ
    max: 50, // Limit mỗi IP tối đa 50 uploads trong 1 giờ
    message: 'Upload limit reached, please try again later.',
    standardHeaders: true,
    legacyHeaders: false
});

module.exports = {
    apiLimiter,
    authLimiter,
    uploadLimiter
};