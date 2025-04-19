const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true
    },
    name: String,
    picture: String,
    phoneNumber: String,
    address: String,
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    lastLogin: Date,
    createdAt: {
        type: Date,
        default: Date.now
    },
    // Thêm các trường mới
    emailVerified: {
        type: Boolean,
        default: false
    },
    emailVerificationToken: String,
    emailVerificationExpires: Date,
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    sessions: [{
        token: String,
        deviceInfo: String,
        lastActive: {
            type: Date,
            default: Date.now
        }
    }]
});

// Middleware để tự động cập nhật lastLogin
userSchema.pre('save', function(next) {
    if (this.isModified('sessions')) {
        this.lastLogin = new Date();
    }
    next();
});

const User = mongoose.model('User', userSchema);

module.exports = User;