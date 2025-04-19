const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/user');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const authController = {
    // Đăng nhập với Google
    googleLogin: async (req, res) => {
        try {
            const { token } = req.body;
            const ticket = await client.verifyIdToken({
                idToken: token,
                audience: process.env.GOOGLE_CLIENT_ID
            });

            const { email, name, picture } = ticket.getPayload();
            
            let user = await User.findOne({ email });
            
            if (!user) {
                user = new User({ email, name, picture });
                await user.save();
            }

            const authToken = jwt.sign({ _id: user._id }, process.env.JWT_SECRET);
            res.send({ user, token: authToken });
        } catch (error) {
            res.status(400).send({ error: error.message });
        }
    },

    // Đăng xuất
    logout: async (req, res) => {
        try {
            req.user.lastLogin = new Date();
            await req.user.save();
            res.send({ message: 'Logged out successfully' });
        } catch (error) {
            res.status(500).send({ error: error.message });
        }
    },

    // Kiểm tra trạng thái authentication
    checkAuth: async (req, res) => {
        try {
            res.send({ user: req.user });
        } catch (error) {
            res.status(401).send({ error: 'Please authenticate.' });
        }
    },

    // Gửi email đặt lại mật khẩu
    requestPasswordReset: async (req, res) => {
        try {
            const { email } = req.body;
            const user = await User.findOne({ email });
            
            if (!user) {
                return res.status(404).send({ error: 'User not found' });
            }

            const resetToken = crypto.randomBytes(32).toString('hex');
            user.resetPasswordToken = resetToken;
            user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
            await user.save();

            // TODO: Implement email sending logic here
            // For now, just return the token
            res.send({ message: 'Password reset email sent', resetToken });
        } catch (error) {
            res.status(500).send({ error: error.message });
        }
    },

    // Xác thực email
    verifyEmail: async (req, res) => {
        try {
            const { token } = req.params;
            const user = await User.findOne({
                emailVerificationToken: token,
                emailVerificationExpires: { $gt: Date.now() }
            });

            if (!user) {
                return res.status(400).send({ error: 'Invalid or expired verification token' });
            }

            user.emailVerified = true;
            user.emailVerificationToken = undefined;
            user.emailVerificationExpires = undefined;
            await user.save();

            res.send({ message: 'Email verified successfully' });
        } catch (error) {
            res.status(500).send({ error: error.message });
        }
    },

    // Quản lý phiên đăng nhập
    listSessions: async (req, res) => {
        try {
            const user = await User.findById(req.user._id).select('+sessions');
            res.send(user.sessions || []);
        } catch (error) {
            res.status(500).send({ error: error.message });
        }
    },

    // Đăng xuất khỏi tất cả các thiết bị
    logoutAllSessions: async (req, res) => {
        try {
            req.user.sessions = [];
            await req.user.save();
            res.send({ message: 'Logged out from all sessions' });
        } catch (error) {
            res.status(500).send({ error: error.message });
        }
    }
};

module.exports = authController;