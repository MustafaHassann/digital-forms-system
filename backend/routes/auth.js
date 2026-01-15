const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../database');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Login route
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Validate input
        if (!username || !password) {
            return res.status(400).json({ message: 'Username and password are required' });
        }

        // Get user from database
        const user = await db.getUserByUsername(username);
        
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Check password
        const isValidPassword = await bcrypt.compare(password, user.password);
        
        if (!isValidPassword) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Update last login
        await new Promise((resolve, reject) => {
            db.db.run(
                "UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?",
                [user.id],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });

        // Create token
        const token = jwt.sign(
            { 
                userId: user.id, 
                username: user.username, 
                role: user.role 
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Log activity
        await db.logActivity({
            user_id: user.id,
            action: 'login',
            details: 'User logged into the system',
            ip_address: req.ip,
            user_agent: req.get('User-Agent')
        });

        // Return user data (excluding password) and token
        const { password: _, ...userData } = user;
        res.json({
            message: 'Login successful',
            token,
            user: userData
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Logout route
router.post('/logout', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        const decoded = jwt.decode(token);
        
        if (decoded?.userId) {
            await db.logActivity({
                user_id: decoded.userId,
                action: 'logout',
                details: 'User logged out of the system',
                ip_address: req.ip,
                user_agent: req.get('User-Agent')
            });
        }
        
        res.json({ message: 'Logout successful' });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Validate token route
router.post('/validate', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ valid: false });
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        
        // Verify user still exists and is active
        const user = await new Promise((resolve, reject) => {
            db.db.get("SELECT id, username, role, is_active FROM users WHERE id = ?", [decoded.userId], (err, row) => {
                if (err) reject(err);
                resolve(row);
            });
        });

        if (!user || !user.is_active) {
            return res.status(401).json({ valid: false });
        }

        res.json({ valid: true, user: decoded });
    } catch (error) {
        res.json({ valid: false });
    }
});

// Change password route
router.post('/change-password', async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        
        // Get user current password
        const user = await new Promise((resolve, reject) => {
            db.db.get("SELECT password FROM users WHERE id = ?", [decoded.userId], (err, row) => {
                if (err) reject(err);
                resolve(row);
            });
        });

        // Verify current password
        const isValidPassword = await bcrypt.compare(currentPassword, user.password);
        
        if (!isValidPassword) {
            return res.status(400).json({ message: 'Current password is incorrect' });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        // Update password
        await new Promise((resolve, reject) => {
            db.db.run(
                "UPDATE users SET password = ? WHERE id = ?",
                [hashedPassword, decoded.userId],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });

        // Log activity
        await db.logActivity({
            user_id: decoded.userId,
            action: 'change_password',
            details: 'User changed their password',
            ip_address: req.ip,
            user_agent: req.get('User-Agent')
        });

        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

module.exports = router;