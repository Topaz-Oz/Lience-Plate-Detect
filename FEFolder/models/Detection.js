const mongoose = require('mongoose');

const detectionSchema = new mongoose.Schema({
    plateNumber: {
        type: String,
        required: true,
        index: true
    },
    confidence: {
        type: Number,
        required: true
    },
    imagePath: {
        type: String,
        required: true
    },
    province: {
        type: String,
        required: true,
        index: true
    },
    provinceConfidence: {
        type: Number,
        required: true,
        default: 0
    },
    vehicleType: {
        type: String,
        required: true
    },
    location: {
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point'
        },
        coordinates: {
            type: [Number],
            default: [0, 0]
        }
    },
    detectedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now,
        index: true
    },
    verificationStatus: {
        type: String,
        enum: ['pending', 'verified', 'rejected'],
        default: 'pending'
    },
    verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    verificationNotes: String
});

// Index cho tìm kiếm địa lý
detectionSchema.index({ location: '2dsphere' });

// Index cho full-text search
detectionSchema.index({ 
    licensePlate: 'text',
    province: 'text'
});

// Virtual field cho imageURL đầy đủ
detectionSchema.virtual('fullImageUrl').get(function() {
    return process.env.BASE_URL + '/uploads/' + this.imageUrl;
});

// Xóa ảnh khi xóa record
detectionSchema.pre('remove', async function(next) {
    try {
        const fs = require('fs').promises;
        const path = require('path');
        await fs.unlink(path.join(__dirname, '../uploads', this.imageUrl));
        next();
    } catch (error) {
        next(error);
    }
});

// Method thống kê theo tỉnh/thành
detectionSchema.statics.getProvinceStats = function() {
    return this.aggregate([
        {
            $group: {
                _id: '$province',
                count: { $sum: 1 }
            }
        },
        {
            $sort: { count: -1 }
        }
    ]);
};

// Method thống kê theo loại xe
detectionSchema.statics.getVehicleTypeStats = function() {
    return this.aggregate([
        {
            $group: {
                _id: '$vehicleType',
                count: { $sum: 1 }
            }
        },
        {
            $sort: { count: -1 }
        }
    ]);
};

// Method thống kê theo thời gian
detectionSchema.statics.getDailyStats = function(days = 7) {
    return this.aggregate([
        {
            $match: {
                timestamp: {
                    $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000)
                }
            }
        },
        {
            $group: {
                _id: {
                    $dateToString: { format: '%Y-%m-%d', date: '$timestamp' }
                },
                count: { $sum: 1 }
            }
        },
        {
            $sort: { _id: 1 }
        }
    ]);
};

module.exports = mongoose.model('Detection', detectionSchema);