const User = require('../models/User');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const { OAuth2Client } = require('google-auth-library');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

class AuthController {
    async register(req, res) {
        try {
            const { username, password } = req.body;
            const user = new User({ username, password });
            await user.save();
            
            const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
                expiresIn: process.env.JWT_EXPIRES_IN || '7d'
            });
            
            res.json({ token, user: { id: user._id, username: user.username } });
        } catch (error) {
            logger.error('Registration error:', error);
            res.status(400).json({ error: error.message });
        }
    }

    async login(req, res) {
        try {
            const { username, password } = req.body;
            const user = await User.findOne({ username });
            
            if (!user || !await user.comparePassword(password)) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }
            
            const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
                expiresIn: process.env.JWT_EXPIRES_IN || '7d'
            });
            
            res.json({ token, user: { id: user._id, username: user.username } });
        } catch (error) {
            logger.error('Login error:', error);
            res.status(500).json({ error: error.message });
        }
    }

    async logout(req, res) {
        // JWT-based logout is handled client-side
        res.json({ message: 'Logged out successfully' });
    }

    async getCurrentUser(req, res) {
        try {
            if (!req.user) {
                return res.status(401).json({ error: 'Not authenticated' });
            }
            const user = await User.findById(req.user._id).select('-password');
            res.json(user);
        } catch (error) {
            logger.error('Get current user error:', error);
            res.status(500).json({ error: error.message });
        }
    }

    async loginWithGoogle(req, res) {
        try {
            const { credential } = req.body;
            
            if (!credential) {
                logger.error('Google login error: No credential provided');
                return res.status(400).json({ error: 'No Google credential provided' });
            }

            // Verify Google token
            const ticket = await googleClient.verifyIdToken({
                idToken: credential,
                audience: process.env.GOOGLE_CLIENT_ID
            }).catch(error => {
                logger.error('Google token verification error:', error);
                throw new Error('Invalid Google token');
            });
            
            const payload = ticket.getPayload();
            if (!payload) {
                throw new Error('Invalid Google token payload');
            }

            const { email, name, picture, sub: googleId } = payload;

            // Find or create user
            let user = await User.findOne({ email });
            
            if (!user) {
                // Create new user
                const username = email.split('@')[0];
                try {
                    user = new User({
                        username,
                        email,
                        name,
                        picture,
                        googleId,
                        isGoogleAccount: true
                    });
                    await user.save();
                    logger.info('New Google user created:', { email });
                } catch (err) {
                    logger.error('Error creating new Google user:', err);
                    throw new Error('Failed to create user account');
                }
            } else {
                // Update existing user
                try {
                    user.name = name;
                    user.picture = picture;
                    user.googleId = googleId;
                    user.isGoogleAccount = true;
                    await user.save();
                    logger.info('Updated Google user:', { email });
                } catch (err) {
                    logger.error('Error updating Google user:', err);
                    throw new Error('Failed to update user account');
                }
            }

            // Generate JWT token
            const token = jwt.sign({ 
                userId: user._id,
                email: user.email
            }, process.env.JWT_SECRET, {
                expiresIn: process.env.JWT_EXPIRES_IN || '7d'
            });

            res.json({
                token,
                user: {
                    id: user._id,
                    username: user.username,
                    name: user.name,
                    email: user.email,
                    picture: user.picture
                }
            });

        } catch (error) {
            logger.error('Google login error:', error);
            res.status(401).json({ 
                error: 'Google authentication failed',
                message: error.message,
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
}

module.exports = new AuthController();