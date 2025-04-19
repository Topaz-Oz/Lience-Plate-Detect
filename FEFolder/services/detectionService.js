const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;

class DetectionService {
    constructor() {
        this.pythonPath = 'python';  // Assuming python is in PATH
        this.scriptPath = path.join(__dirname, '../../License-Plate-Recognition/lp_image.py');
    }

    async detectPlate(imagePath) {
        return new Promise((resolve, reject) => {
            const process = spawn(this.pythonPath, [this.scriptPath, imagePath]);
            let outputData = '';
            let errorData = '';

            process.stdout.on('data', (data) => {
                outputData += data.toString();
            });

            process.stderr.on('data', (data) => {
                errorData += data.toString();
            });

            process.on('close', (code) => {
                if (code !== 0) {
                    reject(new Error(`Detection failed: ${errorData}`));
                    return;
                }

                try {
                    const result = JSON.parse(outputData);
                    resolve(result);
                } catch (error) {
                    reject(new Error('Invalid detection result format'));
                }
            });
        });
    }

    async detectFromStream(imageBuffer) {
        const tempPath = path.join(__dirname, '../../uploads/temp_' + Date.now() + '.jpg');
        
        try {
            // Save buffer to temporary file
            await fs.writeFile(tempPath, imageBuffer);
            
            // Process the image
            const result = await this.detectPlate(tempPath);
            
            // Clean up
            await fs.unlink(tempPath);
            
            return result;
        } catch (error) {
            // Clean up on error
            try {
                await fs.unlink(tempPath);
            } catch (unlinkError) {
                console.error('Error cleaning up temporary file:', unlinkError);
            }
            
            throw error;
        }
    }

    async validateDetection(result) {
        // Implement validation logic for detection results
        if (!result || !result.plateNumber) {
            throw new Error('Invalid detection result');
        }

        // Validate confidence threshold
        if (result.confidence < 0.6) {
            throw new Error('Low confidence detection');
        }

        // Validate plate number format
        const platePattern = /^[0-9]{2}[A-Z][0-9]?-[0-9]{4,5}$/;
        if (!platePattern.test(result.plateNumber)) {
            throw new Error('Invalid plate number format');
        }

        return result;
    }
}

module.exports = new DetectionService();