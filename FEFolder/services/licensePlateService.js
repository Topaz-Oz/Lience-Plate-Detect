const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const logger = require('../utils/logger');

class LicensePlateService {
    constructor() {
        this.pythonPath = process.env.PYTHON_PATH || 'python';
        this.scriptPath = path.resolve(__dirname, '../../License-Plate-Recognition/lp_image.py');
    }

    async detectFromImage(imagePath) {
        try {
            // Verify image exists
            await fs.access(imagePath);
            
            return new Promise((resolve, reject) => {
                const pythonProcess = spawn(this.pythonPath, [this.scriptPath, imagePath]);
                let result = '';
                let error = '';

                pythonProcess.stdout.on('data', (data) => {
                    result += data.toString();
                });

                pythonProcess.stderr.on('data', (data) => {
                    error += data.toString();
                });

                pythonProcess.on('close', (code) => {
                    if (code !== 0) {
                        logger.error(`Python process exited with code ${code}: ${error}`);
                        reject(new Error(error || 'Failed to detect license plate'));
                        return;
                    }

                    try {
                        const detectionResult = JSON.parse(result);
                        resolve(detectionResult);
                    } catch (e) {
                        logger.error('Failed to parse detection result:', e);
                        reject(new Error('Invalid detection result format'));
                    }
                });
            });
        } catch (error) {
            logger.error('License plate detection error:', error);
            throw error;
        }
    }

    async detectFromVideo(videoPath) {
        // TODO: Implement video processing
        throw new Error('Video processing not implemented yet');
    }

    async detectFromWebcam(streamData) {
        // TODO: Implement webcam stream processing
        throw new Error('Webcam processing not implemented yet');
    }
}

module.exports = new LicensePlateService();