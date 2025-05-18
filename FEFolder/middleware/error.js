const logger = require('../utils/logger');

class AppError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
        this.isOperational = true;

        Error.captureStackTrace(this, this.constructor);
    }
}

const errorHandler = (err, req, res, next) => {
    logger.error(err.stack);

    if (err.name === 'ValidationError') {
        return res.status(400).json({
            error: Object.values(err.errors).map(e => e.message).join(', ')
        });
    }

    if (err.name === 'MongoError' && err.code === 11000) {
        return res.status(400).json({
            error: 'Duplicate value entered'
        });
    }

    if (err.name === 'MulterError') {
        return res.status(400).json({
            error: err.message
        });
    }

    res.status(err.status || 500).json({
        error: err.message || 'Internal Server Error'
    });
};

const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

module.exports = {
    AppError,
    errorHandler,
    asyncHandler
};