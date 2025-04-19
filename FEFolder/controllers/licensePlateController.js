const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const multer = require('multer');
const DetectionHistory = require('../models/detectionHistory');
const detectionService = require('../services/detectionService');

const licensePlateController = {
    // Detect license plate from uploaded image
    detectPlate: async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).send({ error: 'No image uploaded' });
            }

            const wsService = req.app.get('wsService');

            // Send initial progress
            wsService.sendDetectionProgress(req.user._id, {
                stage: 'detecting',
                percent: 0,
                message: 'Bắt đầu xử lý ảnh...'
            });

            // Process the uploaded image
            wsService.sendDetectionProgress(req.user._id, {
                stage: 'detecting',
                percent: 30,
                message: 'Đang phát hiện biển số...'
            });

            const result = await detectionService.detectPlate(req.file.path);
            
            wsService.sendDetectionProgress(req.user._id, {
                stage: 'detecting',
                percent: 60,
                message: 'Đang nhận dạng ký tự...'
            });

            // Validate detection result
            const validatedResult = await detectionService.validateDetection(result);

            wsService.sendDetectionProgress(req.user._id, {
                stage: 'detecting',
                percent: 90,
                message: 'Đang lưu kết quả...'
            });

            // Save detection result
            const detection = new DetectionHistory({
                userId: req.user._id,
                plateNumber: validatedResult.plateNumber,
                confidence: validatedResult.confidence,
                location: {
                    type: 'Point',
                    coordinates: req.body.coordinates ? 
                        [parseFloat(req.body.coordinates.longitude), parseFloat(req.body.coordinates.latitude)] :
                        [0, 0]
                },
                province: validatedResult.province,
                vehicleType: validatedResult.vehicleType,
                imageUrl: '/uploads/' + path.basename(req.file.path)
            });

            await detection.save();

            // Send final result through WebSocket
            wsService.sendDetectionResult(req.user._id, {
                ...validatedResult,
                imageUrl: detection.imageUrl,
                _id: detection._id
            });

            res.send({
                ...validatedResult,
                imageUrl: detection.imageUrl,
                _id: detection._id
            });

        } catch (error) {
            // Send error through WebSocket
            const wsService = req.app.get('wsService');
            wsService.sendToUser(req.user._id, {
                type: 'error',
                message: error.message
            });
            res.status(400).send({ error: error.message });
        }
    },

    // Process video stream for license plate detection
    detectFromStream: async (req, res) => {
        try {
            if (!req.body.image) {
                return res.status(400).send({ error: 'No image data received' });
            }

            const wsService = req.app.get('wsService');

            // Send initial progress
            wsService.sendDetectionProgress(req.user._id, {
                stage: 'detecting',
                percent: 0,
                message: 'Bắt đầu xử lý luồng video...'
            });

            // Convert base64 to buffer
            const imageBuffer = Buffer.from(req.body.image.split(',')[1], 'base64');
            
            wsService.sendDetectionProgress(req.user._id, {
                stage: 'detecting',
                percent: 30,
                message: 'Đang phát hiện biển số...'
            });

            // Process the image
            const result = await detectionService.detectFromStream(imageBuffer);
            
            wsService.sendDetectionProgress(req.user._id, {
                stage: 'detecting',
                percent: 60,
                message: 'Đang nhận dạng ký tự...'
            });

            // Validate detection result
            const validatedResult = await detectionService.validateDetection(result);

            wsService.sendDetectionProgress(req.user._id, {
                stage: 'detecting',
                percent: 90,
                message: 'Đang lưu kết quả...'
            });

            // Save detection result
            const detection = new DetectionHistory({
                userId: req.user._id,
                plateNumber: validatedResult.plateNumber,
                confidence: validatedResult.confidence,
                location: {
                    type: 'Point',
                    coordinates: req.body.coordinates ? 
                        [parseFloat(req.body.coordinates.longitude), parseFloat(req.body.coordinates.latitude)] :
                        [0, 0]
                },
                province: validatedResult.province,
                vehicleType: validatedResult.vehicleType
            });

            await detection.save();

            // Send final result through WebSocket
            wsService.sendDetectionResult(req.user._id, {
                ...validatedResult,
                _id: detection._id,
                timestamp: detection.timestamp
            });

            res.send({
                ...validatedResult,
                _id: detection._id,
                timestamp: detection.timestamp
            });

        } catch (error) {
            // Send error through WebSocket
            const wsService = req.app.get('wsService');
            wsService.sendToUser(req.user._id, {
                type: 'error',
                message: error.message
            });
            res.status(400).send({ error: error.message });
        }
    },

    // Get detection history
    getHistory: async (req, res) => {
        try {
            const { page = 1, limit = 10, startDate, endDate } = req.query;
            
            const filter = { userId: req.user._id };
            
            if (startDate && endDate) {
                filter.timestamp = {
                    $gte: new Date(startDate),
                    $lte: new Date(endDate)
                };
            }

            const detections = await DetectionHistory.find(filter)
                .sort({ timestamp: -1 })
                .skip((page - 1) * limit)
                .limit(parseInt(limit));

            const total = await DetectionHistory.countDocuments(filter);

            res.send({
                records: detections,
                totalPages: Math.ceil(total / limit),
                currentPage: parseInt(page)
            });

        } catch (error) {
            res.status(500).send({ error: error.message });
        }
    },

    // Save detection result
    saveDetection: async (req, res) => {
        try {
            const { plateNumber, confidence, coordinates, imageUrl } = req.body;

            if (!plateNumber || !confidence) {
                return res.status(400).send({ error: 'Missing required fields' });
            }

            const detection = new DetectionHistory({
                userId: req.user._id,
                plateNumber,
                confidence,
                location: {
                    type: 'Point',
                    coordinates: coordinates ? 
                        [parseFloat(coordinates.longitude), parseFloat(coordinates.latitude)] :
                        [0, 0]
                },
                imageUrl
            });

            await detection.save();
            res.send(detection);

        } catch (error) {
            res.status(400).send({ error: error.message });
        }
    }
};

module.exports = licensePlateController;