const express = require('express');
const router = express.Router();
const detectionController = require('../controllers/detectionController');
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

// Cấu hình multer cho upload ảnh
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../uploads'));
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Only support .jpg, .jpeg and .png files'));
    }
});

// Video upload configuration
const videoStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../uploads/videos'));
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const videoUpload = multer({
    storage: videoStorage,
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB limit for videos
    },
    fileFilter: (req, file, cb) => {
        const filetypes = /mp4|avi|mov/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Error: Videos Only!'));
    }
});

// Routes
router.post('/detect/image', auth, upload.single('image'), detectionController.detectPlate);
router.post('/detect/video', auth, videoUpload.single('video'), detectionController.detectFromVideo);
router.post('/detect/webcam', auth, detectionController.detectFromWebcam);

// Query routes
router.get('/history', auth, detectionController.getDetectionHistory);
router.get('/stats', auth, detectionController.getDetectionStats);
router.patch('/:id/verify', auth, detectionController.verifyDetection);
router.delete('/:id', auth, detectionController.deleteDetection);

module.exports = router;