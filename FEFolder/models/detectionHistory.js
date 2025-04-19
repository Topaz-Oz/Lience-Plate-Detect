const mongoose = require('mongoose');

const detectionHistorySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    plateNumber: {
        type: String,
        required: true
    },
    confidence: {
        type: Number,
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
            required: true
        }
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    vehicleType: String,
    province: String,
    imageUrl: String,
    status: {
        type: String,
        enum: ['pending', 'verified', 'rejected'],
        default: 'pending'
    },
    verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    verifiedAt: Date,
    notes: String
});

// Index for location-based queries
detectionHistorySchema.index({ location: '2dsphere' });

// Add text index for searching
detectionHistorySchema.index({ 
    plateNumber: 'text',
    province: 'text',
    notes: 'text'
});

const DetectionHistory = mongoose.model('DetectionHistory', detectionHistorySchema);

module.exports = DetectionHistory;