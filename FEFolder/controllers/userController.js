const User = require('../models/User');
const logger = require('../utils/logger');

class UserController {
    async getProfile(req, res) {
        try {
            const user = await User.findById(req.user._id).select('-password');
            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }
            res.json(user);
        } catch (error) {
            logger.error('Get profile error:', error);
            res.status(500).json({ error: error.message });
        }
    }

    async updateProfile(req, res) {
        try {
            const updates = req.body;
            delete updates.password; // Prevent password update through this route

            const user = await User.findByIdAndUpdate(
                req.user._id,
                { $set: updates },
                { new: true, runValidators: true }
            ).select('-password');

            res.json(user);
        } catch (error) {
            logger.error('Update profile error:', error);
            res.status(400).json({ error: error.message });
        }
    }

    async changePassword(req, res) {
        try {
            const { currentPassword, newPassword } = req.body;
            const user = await User.findById(req.user._id);

            if (!await user.comparePassword(currentPassword)) {
                return res.status(401).json({ error: 'Current password is incorrect' });
            }

            user.password = newPassword;
            await user.save();

            res.json({ message: 'Password updated successfully' });
        } catch (error) {
            logger.error('Change password error:', error);
            res.status(400).json({ error: error.message });
        }
    }
}

module.exports = new UserController();