const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');

class FileCleanupService {
    constructor(options = {}) {
        this.uploadDir = options.uploadDir || path.join(__dirname, '../uploads');
        this.maxAge = options.maxAge || 24 * 60 * 60 * 1000; // 24 hours
        this.interval = options.interval || 60 * 60 * 1000; // 1 hour
        this.cleanupTimer = null;
    }

    async cleanup() {
        try {
            const now = Date.now();
            const files = await fs.readdir(this.uploadDir);

            for (const file of files) {
                const filePath = path.join(this.uploadDir, file);
                const stats = await fs.stat(filePath);

                // Check if file is older than maxAge
                if (now - stats.mtime.getTime() > this.maxAge) {
                    try {
                        await fs.unlink(filePath);
                        logger.info(`Cleaned up temp file: ${file}`);
                    } catch (err) {
                        logger.error(`Error deleting temp file ${file}:`, err);
                    }
                }
            }
        } catch (error) {
            logger.error('File cleanup error:', error);
        }
    }

    start() {
        // Do initial cleanup
        this.cleanup();

        // Schedule periodic cleanup
        this.cleanupTimer = setInterval(() => this.cleanup(), this.interval);
        logger.info('File cleanup service started');
    }

    stop() {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = null;
            logger.info('File cleanup service stopped');
        }
    }
}

module.exports = new FileCleanupService();
