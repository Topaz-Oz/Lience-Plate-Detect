const Detection = require('../models/Detection');
const logger = require('../utils/logger');
const licensePlateService = require('../services/licensePlateService');
const WebSocketService = require('../services/websocket');
const fs = require('fs').promises;
const path = require('path');

class DetectionController {
    async detectPlate(req, res) {
        try {
            if (!req.file) {
                return res.status(400).json({ error: 'No image file uploaded' });
            }

            const wsService = req.app.get('wsService');

            // Initial progress update
            wsService.sendDetectionProgress(req.user._id, {
                stage: 'detecting',
                progress: 0,
                status: 'Starting detection process'
            });

            // Detect license plate using our Python service
            const result = await licensePlateService.detectFromImage(req.file.path);

            // Update progress
            wsService.sendDetectionProgress(req.user._id, {
                stage: 'complete',
                progress: 100,
                status: 'Detection complete'
            });

            // Save detection to database
            const detection = new Detection({
                user: req.user._id,
                plateNumber: result.plateNumber,
                confidence: result.confidence,
                province: result.province,
                vehicleType: result.vehicleType,
                provinceConfidence: result.provinceConfidence,
                imagePath: req.file.path,
                bbox: result.bbox
            });
            await detection.save();

            return res.json(result);

        } catch (error) {
            logger.error('Detection error:', error);
            wsService.sendDetectionProgress(req.user._id, {
                stage: 'error',
                status: 'Detection failed'
            });
            return res.status(500).json({ error: error.message });
        }
    }

    async getHistory(req, res) {
        try {
            const detections = await Detection.find()
                .sort({ timestamp: -1 })
                .populate('detectedBy', 'username')
                .populate('verifiedBy', 'username');
            
            res.json(detections);
        } catch (error) {
            logger.error('Error fetching detection history:', error);
            res.status(500).json({ error: error.message });
        }
    }

    async getStats(req, res) {
        try {
            const [totalDetections, verifiedDetections, provinceStats, vehicleTypeStats, dailyStats] = 
                await Promise.all([
                    Detection.countDocuments(),
                    Detection.countDocuments({ verificationStatus: 'verified' }),
                    Detection.getProvinceStats(),
                    Detection.getVehicleTypeStats(),
                    Detection.getDailyStats(7)
                ]);

            res.json({
                totalDetections,
                verifiedDetections,
                provinceStats,
                vehicleTypeStats,
                dailyStats
            });
        } catch (error) {
            logger.error('Error fetching detection stats:', error);
            res.status(500).json({ error: error.message });
        }
    }

    async verifyDetection(req, res) {
        try {
            const { id } = req.params;
            const { status, notes } = req.body;

            if (!['verified', 'rejected'].includes(status)) {
                return res.status(400).json({ error: 'Invalid status' });
            }

            const detection = await Detection.findById(id);
            if (!detection) {
                return res.status(404).json({ error: 'Detection not found' });
            }

            detection.verificationStatus = status;
            detection.verificationNotes = notes;
            detection.verifiedBy = req.user._id;
            await detection.save();

            res.json(detection);
        } catch (error) {
            logger.error('Error verifying detection:', error);
            res.status(500).json({ error: error.message });
        }
    }

    async deleteDetection(req, res) {
        try {
            const { id } = req.params;
            const detection = await Detection.findById(id);
            
            if (!detection) {
                return res.status(404).json({ error: 'Detection not found' });
            }

            // Xóa ảnh
            const imagePath = path.join(__dirname, '../uploads', detection.imageUrl);
            await fs.unlink(imagePath);

            // Xóa record
            await detection.remove();

            res.json({ message: 'Detection deleted successfully' });
        } catch (error) {
            logger.error('Error deleting detection:', error);
            res.status(500).json({ error: error.message });
        }
    }

    async detectFromVideo(req, res) {
        try {
            if (!req.file) {
                return res.status(400).json({ error: 'No video file uploaded' });
            }

            const wsService = req.app.get('wsService');
            wsService.sendDetectionProgress(req.user._id, {
                stage: 'processing',
                progress: 0,
                status: 'Processing video...'
            });

            const result = await licensePlateService.detectFromVideo(req.file.path);

            // Update progress
            wsService.sendDetectionProgress(req.user._id, {
                stage: 'complete',
                progress: 100,
                status: 'Video processing complete'
            });

            return res.json(result);

        } catch (error) {
            logger.error('Video detection error:', error);
            return res.status(500).json({ error: error.message });
        }
    }

    async detectFromWebcam(req, res) {
        try {
            const wsService = req.app.get('wsService');
            const result = await licensePlateService.detectFromWebcam(req.body);

            // Update progress
            wsService.sendDetectionProgress(req.user._id, {
                stage: 'complete',
                progress: 100,
                status: 'Webcam detection complete'
            });

            return res.json(result);
        } catch (error) {
            logger.error('Webcam detection error:', error);
            return res.status(500).json({ error: error.message });
        }
    }

    async getDetectionHistory(req, res) {
        try {
            const detections = await Detection.find({ user: req.user._id })
                .sort({ timestamp: -1 })
                .select('-__v');
            return res.json(detections);
        } catch (error) {
            logger.error('Error fetching detection history:', error);
            return res.status(500).json({ error: error.message });
        }
    }

    async getDetectionStats(req, res) {
        try {
            const [totalDetections, todayDetections] = await Promise.all([
                Detection.countDocuments({ user: req.user._id }),
                Detection.countDocuments({
                    user: req.user._id,
                    timestamp: { 
                        $gte: new Date().setHours(0, 0, 0, 0) 
                    }
                })
            ]);

            return res.json({
                total: totalDetections,
                today: todayDetections
            });
        } catch (error) {
            logger.error('Error fetching detection stats:', error);
            return res.status(500).json({ error: error.message });
        }
    }
}

module.exports = new DetectionController();