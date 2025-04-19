const User = require('../models/user');

const userController = {
    // Lấy thông tin user hiện tại
    getProfile: async (req, res) => {
        try {
            res.send(req.user);
        } catch (error) {
            res.status(500).send({ error: error.message });
        }
    },

    // Cập nhật thông tin user
    updateProfile: async (req, res) => {
        const updates = Object.keys(req.body);
        const allowedUpdates = ['name', 'phoneNumber', 'address'];
        const isValidOperation = updates.every(update => allowedUpdates.includes(update));

        if (!isValidOperation) {
            return res.status(400).send({ error: 'Invalid updates!' });
        }

        try {
            updates.forEach(update => req.user[update] = req.body[update]);
            await req.user.save();
            res.send(req.user);
        } catch (error) {
            res.status(400).send({ error: error.message });
        }
    },

    // Xóa tài khoản
    deleteAccount: async (req, res) => {
        try {
            await req.user.remove();
            res.send({ message: 'Account deleted successfully' });
        } catch (error) {
            res.status(500).send({ error: error.message });
        }
    },

    // Admin: Lấy danh sách tất cả users
    getAllUsers: async (req, res) => {
        try {
            if (req.user.role !== 'admin') {
                return res.status(403).send({ error: 'Access denied' });
            }
            const users = await User.find({});
            res.send(users);
        } catch (error) {
            res.status(500).send({ error: error.message });
        }
    },

    // Admin: Thay đổi role của user
    changeUserRole: async (req, res) => {
        try {
            if (req.user.role !== 'admin') {
                return res.status(403).send({ error: 'Access denied' });
            }
            
            const { userId, newRole } = req.body;
            if (!['user', 'admin'].includes(newRole)) {
                return res.status(400).send({ error: 'Invalid role' });
            }

            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).send({ error: 'User not found' });
            }

            user.role = newRole;
            await user.save();
            res.send(user);
        } catch (error) {
            res.status(500).send({ error: error.message });
        }
    },

    // Admin: Thay đổi trạng thái active của user
    toggleUserStatus: async (req, res) => {
        try {
            if (req.user.role !== 'admin') {
                return res.status(403).send({ error: 'Access denied' });
            }
            
            const { userId } = req.body;
            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).send({ error: 'User not found' });
            }

            user.isActive = !user.isActive;
            await user.save();
            res.send(user);
        } catch (error) {
            res.status(500).send({ error: error.message });
        }
    },

    // Admin: Lấy thống kê người dùng
    getUserStats: async (req, res) => {
        try {
            if (req.user.role !== 'admin') {
                return res.status(403).send({ error: 'Access denied' });
            }

            const totalUsers = await User.countDocuments();
            const activeUsers = await User.countDocuments({ isActive: true });
            const adminUsers = await User.countDocuments({ role: 'admin' });
            const regularUsers = await User.countDocuments({ role: 'user' });

            const stats = {
                totalUsers,
                activeUsers,
                inactiveUsers: totalUsers - activeUsers,
                adminUsers,
                regularUsers,
            };

            res.send(stats);
        } catch (error) {
            res.status(500).send({ error: error.message });
        }
    }
};

module.exports = userController;