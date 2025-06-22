const Redis = require('ioredis');
const logger = require('../utils/logger');

class RedisManager {
    constructor() {
        this.client = null;
        this.retryCount = 0;
        this.maxRetries = 5;
    }

    async connect() {
        try {
            this.client = new Redis(process.env.REDIS_URL, {
                maxRetriesPerRequest: 3,
                enableReadyCheck: true,
                retryStrategy: (times) => {
                    if (times > this.maxRetries) {
                        logger.error('Max Redis connection retries reached');
                        return null;
                    }
                    return Math.min(times * 200, 2000);
                }
            });

            this.client.on('error', (error) => {
                logger.error('Redis error:', error);
            });

            this.client.on('ready', () => {
                logger.info('Redis connection established');
                this.retryCount = 0;
            });

            this.client.on('close', () => {
                logger.warn('Redis connection closed');
            });

            return this.client;
        } catch (error) {
            logger.error('Redis connection error:', error);
            throw error;
        }
    }

    async disconnect() {
        if (this.client) {
            await this.client.quit();
            this.client = null;
            logger.info('Redis connection closed');
        }
    }

    getClient() {
        if (!this.client) {
            throw new Error('Redis client not initialized');
        }
        return this.client;
    }
}

module.exports = RedisManager;