const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const formRoutes = require('./routes/forms');
const submissionRoutes = require('./routes/submissions');

// Import database
const { initializeDatabase, db } = require('./database');

const app = express();
const PORT = process.env.PORT || 10000;

// Security middleware
app.use(helmet({
    contentSecurityPolicy: false  // Disable for API-only service
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100
});

// CORS - Allow GitHub Pages and local development
app.use(cors({
    origin: [
        'http://localhost:5500',
        'http://localhost:3000',
        'https://mustafahassann.github.io',
        'https://mustafahassann.github.io/digital-forms-system'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Handle preflight requests
app.options('*', cors());

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes ONLY - No static file serving!
app.use('/api/auth', authRoutes);
app.use('/api/forms', formRoutes);
app.use('/api/submissions', submissionRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        service: 'Digital Forms Management System API',
        version: '1.0.0'
    });
});

// Test endpoint for login (simple version for debugging)
app.post('/api/auth/test-login', (req, res) => {
    const { username, password } = req.body;
    
    console.log('Test login attempt:', { username });
    
    if (username === 'admin' && password === 'admin123') {
        res.json({
            message: 'Login successful',
            token: 'test-jwt-token-' + Date.now(),
            user: {
                id: 1,
                username: 'admin',
                email: 'admin@digitalforms.com',
                role: 'admin',
                full_name: 'System Administrator'
            }
        });
    } else {
        res.status(401).json({
            message: 'Invalid credentials'
        });
    }
});

// Root endpoint redirects to health check
app.get('/', (req, res) => {
    res.redirect('/api/health');
});

// 404 handler for undefined routes
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: 'API endpoint does not exist',
        path: req.originalUrl
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server Error:', err.message);
    res.status(err.status || 500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});

// Initialize and start server
async function startServer() {
    try {
        // Initialize database
        await initializeDatabase();
        console.log('✅ Database initialized');
        
        // Start server
        app.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
            console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

// Start the server
startServer();

module.exports = app;