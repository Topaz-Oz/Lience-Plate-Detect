const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { AppError } = require('./error');
const logger = require('../utils/logger');

// Cấu hình storage cho multer
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../uploads');
        const tempDir = path.join(uploadDir, 'temp');
        
        try {
            // Tạo thư mục nếu chưa tồn tại
            await fs.mkdir(uploadDir, { recursive: true });
            await fs.mkdir(tempDir, { recursive: true });
            
            // Cleanup temp files older than 24h
            const files = await fs.readdir(tempDir);
            const now = Date.now();
            for (const file of files) {
                const filePath = path.join(tempDir, file);
                const stats = await fs.stat(filePath);
                if (now - stats.mtimeMs > 24 * 60 * 60 * 1000) {
                    await fs.unlink(filePath);
                }
            }
            
            cb(null, tempDir);
        } catch (error) {
            logger.error('Upload directory error:', error);
            cb(new AppError('Upload directory error', 500));
        }
    },
    filename: (req, file, cb) => {
        // Tạo tên file unique
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
        const ext = path.extname(file.originalname);
        cb(null, `${uniqueSuffix}${ext}`);
    }
});

// Kiểm tra file type
const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png/;
    const mimetype = allowedTypes.test(file.mimetype);
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());

    if (mimetype && extname) {
        cb(null, true);
    } else {
        cb(new AppError('Only .jpg, .jpeg and .png files are allowed', 400));
    }
};

// Cấu hình multer
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
    },
    fileFilter: fileFilter
});

// Middleware xử lý lỗi upload
const handleUploadError = (error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return next(new AppError('File size too large. Maximum size is 5MB', 400));
        }
        return next(new AppError(error.message, 400));
    }
    next(error);
};

// Middleware di chuyển file từ temp sang thư mục chính
const moveFileFromTemp = async (req, res, next) => {
    if (!req.file) return next();

    try {
        const uploadDir = path.join(__dirname, '../uploads');
        const finalPath = path.join(uploadDir, req.file.filename);
        await fs.rename(req.file.path, finalPath);
        req.file.path = finalPath;
        next();
    } catch (error) {
        logger.error('Error moving file:', error);
        next(new AppError('Error processing upload', 500));
    }
};

module.exports = {
    upload,
    handleUploadError,
    moveFileFromTemp
};