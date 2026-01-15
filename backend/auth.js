const jwt = require('jsonwebtoken');
const { db } = require('./database');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

const authMiddleware = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        
        // Verify user still exists and is active
        const user = await new Promise((resolve, reject) => {
            db.db.get("SELECT id, username, role, is_active FROM users WHERE id = ?", [decoded.userId], (err, row) => {
                if (err) reject(err);
                resolve(row);
            });
        });

        if (!user || !user.is_active) {
            return res.status(401).json({ message: 'User account is inactive or does not exist' });
        }

        next();
    } catch (error) {
        return res.status(401).json({ message: 'Invalid or expired token' });
    }
};

const adminMiddleware = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
    }
    next();
};

module.exports = { authMiddleware, adminMiddleware };