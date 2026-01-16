// ========== DIGITAL FORMS MANAGEMENT SYSTEM API ==========
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 10000;
const JWT_SECRET = process.env.JWT_SECRET || 'digital-forms-secret-key';

// ========== MIDDLEWARE ==========
app.use(cors({
    origin: [
        'https://mustafahassann.github.io',
        'http://localhost:3000',
        'http://127.0.0.1:5500',
        'http://localhost:5500'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

app.options('*', cors());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
    next();
});

// ========== IN-MEMORY DATABASE ==========
// Users database
const users = [
    {
        id: 1,
        username: 'admin',
        password: '$2a$10$XyZ/ABC123DEF456GHI789.JKLMNOPQRSTUVWXYZ012345', // admin123
        email: 'admin@digitalforms.com',
        full_name: 'System Administrator',
        role: 'admin',
        department: 'Management',
        is_active: true,
        created_at: new Date().toISOString(),
        last_login: null
    },
    {
        id: 2,
        username: 'agent1',
        password: '$2a$10$XyZ/ABC123DEF456GHI789.JKLMNOPQRSTUVWXYZ012345', // password123
        email: 'agent1@company.com',
        full_name: 'John Smith',
        role: 'agent',
        department: 'Sales',
        is_active: true,
        created_at: new Date().toISOString(),
        last_login: null
    }
];

// Mock databases
const formLinks = [];
const submissions = [];
const activityLogs = [];

// Password comparison (using demo passwords)
const checkPassword = (username, password) => {
    return (username === 'admin' && password === 'admin123') ||
           (username === 'agent1' && password === 'password123');
};

// ========== HELPER FUNCTIONS ==========
const generateLinkCode = () => {
    return Math.random().toString(36).substring(2, 10) + 
           Math.random().toString(36).substring(2, 10);
};

const generateId = (prefix) => {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Authentication middleware
const authenticate = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ 
                success: false, 
                message: 'Access token required' 
            });
        }
        
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // Find user
        const user = users.find(u => u.id === decoded.userId && u.is_active);
        
        if (!user) {
            return res.status(401).json({ 
                success: false, 
                message: 'User not found or inactive' 
            });
        }
        
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ 
            success: false, 
            message: 'Invalid or expired token' 
        });
    }
};

// Admin middleware
const isAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ 
            success: false, 
            message: 'Admin access required' 
        });
    }
    next();
};

// ========== API ENDPOINTS ==========

// 1. Health Check
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'Digital Forms API is running',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        environment: process.env.NODE_ENV,
        stats: {
            users: users.length,
            formLinks: formLinks.length,
            submissions: submissions.length
        }
    });
});

// 2. Authentication
app.post('/api/auth/login', (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: 'Username and password are required'
            });
        }
        
        // Find user
        const user = users.find(u => u.username === username);
        
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }
        
        // Check password
        if (!checkPassword(username, password)) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }
        
        // Update last login
        user.last_login = new Date().toISOString();
        
        // Generate token
        const token = jwt.sign(
            {
                userId: user.id,
                username: user.username,
                role: user.role,
                full_name: user.full_name
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        // Log activity
        activityLogs.push({
            id: generateId('log'),
            user_id: user.id,
            action: 'login',
            details: `User logged in from ${req.ip}`,
            ip_address: req.ip,
            user_agent: req.get('User-Agent'),
            created_at: new Date().toISOString()
        });
        
        // Return user data (without password)
        const { password: _, ...userData } = user;
        
        res.json({
            success: true,
            message: 'Login successful',
            token,
            user: userData
        });
        
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

app.post('/api/auth/validate', authenticate, (req, res) => {
    res.json({
        success: true,
        valid: true,
        user: req.user
    });
});

app.post('/api/auth/logout', authenticate, (req, res) => {
    // Log activity
    activityLogs.push({
        id: generateId('log'),
        user_id: req.user.userId,
        action: 'logout',
        details: 'User logged out',
        ip_address: req.ip,
        created_at: new Date().toISOString()
    });
    
    res.json({
        success: true,
        message: 'Logout successful'
    });
});

// 3. Form Links Management
app.post('/api/forms/create-link', authenticate, (req, res) => {
    try {
        const { unit_number, sales_agent, client_email, expiry_days, notes } = req.body;
        
        if (!unit_number || !sales_agent) {
            return res.status(400).json({
                success: false,
                message: 'Unit number and sales agent are required'
            });
        }
        
        const linkCode = generateLinkCode();
        const linkId = generateId('link');
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + (expiry_days || 14));
        
        const newLink = {
            id: linkId,
            user_id: req.user.userId,
            unit_number,
            sales_agent,
            link_code: linkCode,
            client_email: client_email || null,
            expiry_days: expiry_days || 14,
            created_at: new Date().toISOString(),
            expires_at: expiryDate.toISOString(),
            status: 'active',
            submissions_count: 0,
            notes: notes || null
        };
        
        formLinks.push(newLink);
        
        // Log activity
        activityLogs.push({
            id: generateId('log'),
            user_id: req.user.userId,
            action: 'create_link',
            details: `Created form link for ${unit_number}`,
            created_at: new Date().toISOString()
        });
        
        // Construct full URL
        const frontendUrl = 'https://mustafahassann.github.io/digital-forms-system';
        const fullUrl = `${frontendUrl}/form.html?code=${linkCode}`;
        
        res.status(201).json({
            success: true,
            message: 'Form link created successfully',
            data: {
                id: linkId,
                link_code: linkCode,
                full_url: fullUrl,
                unit_number,
                sales_agent,
                expires_at: expiryDate.toISOString()
            }
        });
        
    } catch (error) {
        console.error('Create link error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create form link'
        });
    }
});

app.get('/api/forms/my-links', authenticate, (req, res) => {
    try {
        const userLinks = formLinks
            .filter(link => link.user_id === req.user.userId)
            .map(link => ({
                ...link,
                is_expired: new Date(link.expires_at) < new Date()
            }));
        
        res.json({
            success: true,
            data: userLinks
        });
        
    } catch (error) {
        console.error('Get links error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve form links'
        });
    }
});

app.get('/api/forms/link/:linkCode', authenticate, (req, res) => {
    try {
        const link = formLinks.find(l => l.link_code === req.params.linkCode);
        
        if (!link) {
            return res.status(404).json({
                success: false,
                message: 'Form link not found'
            });
        }
        
        // Check permission
        if (req.user.role !== 'admin' && link.user_id !== req.user.userId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }
        
        res.json({
            success: true,
            data: link
        });
        
    } catch (error) {
        console.error('Get link error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve form link'
        });
    }
});

// 4. Form Submissions
app.post('/api/submissions/submit/:linkCode', (req, res) => {
    try {
        const { linkCode } = req.params;
        const { customer_name, customer_email, form_data } = req.body;
        
        if (!customer_name || !form_data) {
            return res.status(400).json({
                success: false,
                message: 'Customer name and form data are required'
            });
        }
        
        // Find link
        const link = formLinks.find(l => l.link_code === linkCode);
        
        if (!link) {
            return res.status(404).json({
                success: false,
                message: 'Form link not found or expired'
            });
        }
        
        // Check if link is expired
        if (new Date(link.expires_at) < new Date()) {
            return res.status(400).json({
                success: false,
                message: 'Form link has expired'
            });
        }
        
        // Create submission
        const submissionId = generateId('sub');
        const submission = {
            id: submissionId,
            link_id: link.id,
            user_id: link.user_id,
            customer_name,
            customer_email: customer_email || null,
            submission_data: form_data,
            submitted_at: new Date().toISOString(),
            status: 'pending',
            review_notes: null,
            reviewed_by: null,
            reviewed_at: null,
            unit_number: link.unit_number,
            sales_agent: link.sales_agent
        };
        
        submissions.push(submission);
        
        // Update link count
        link.submissions_count = (link.submissions_count || 0) + 1;
        
        // Log activity
        activityLogs.push({
            id: generateId('log'),
            user_id: link.user_id,
            action: 'form_submission',
            details: `New submission from ${customer_name} for ${link.unit_number}`,
            created_at: new Date().toISOString()
        });
        
        res.status(201).json({
            success: true,
            message: 'Form submitted successfully',
            data: {
                submission_id: submissionId,
                customer_name,
                submitted_at: submission.submitted_at
            }
        });
        
    } catch (error) {
        console.error('Submit error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to submit form'
        });
    }
});

app.get('/api/submissions/my-submissions', authenticate, (req, res) => {
    try {
        const userSubmissions = submissions
            .filter(sub => sub.user_id === req.user.userId)
            .map(sub => ({
                ...sub,
                submission_data: typeof sub.submission_data === 'string' 
                    ? JSON.parse(sub.submission_data) 
                    : sub.submission_data
            }));
        
        res.json({
            success: true,
            data: userSubmissions
        });
        
    } catch (error) {
        console.error('Get submissions error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve submissions'
        });
    }
});

// 5. Dashboard Stats
app.get('/api/dashboard/stats', authenticate, (req, res) => {
    try {
        const userLinks = formLinks.filter(link => link.user_id === req.user.userId);
        const userSubmissions = submissions.filter(sub => sub.user_id === req.user.userId);
        const expiredLinks = userLinks.filter(link => new Date(link.expires_at) < new Date()).length;
        
        const stats = {
            total_links: userLinks.length,
            active_links: userLinks.filter(link => link.status === 'active' && new Date(link.expires_at) >= new Date()).length,
            expired_links: expiredLinks,
            total_submissions: userSubmissions.length,
            pending_submissions: userSubmissions.filter(sub => sub.status === 'pending').length,
            approved_submissions: userSubmissions.filter(sub => sub.status === 'approved').length,
            rejected_submissions: userSubmissions.filter(sub => sub.status === 'rejected').length
        };
        
        // Add admin stats
        if (req.user.role === 'admin') {
            stats.total_users = users.length;
            stats.active_users = users.filter(u => u.is_active).length;
            stats.total_system_links = formLinks.length;
            stats.total_system_submissions = submissions.length;
        }
        
        res.json({
            success: true,
            data: stats
        });
        
    } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve statistics'
        });
    }
});

// 6. Admin Endpoints
app.get('/api/admin/users', authenticate, isAdmin, (req, res) => {
    try {
        const userList = users.map(user => {
            const { password, ...userData } = user;
            return userData;
        });
        
        res.json({
            success: true,
            data: userList
        });
        
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve users'
        });
    }
});

app.get('/api/admin/all-links', authenticate, isAdmin, (req, res) => {
    try {
        const allLinks = formLinks.map(link => {
            const user = users.find(u => u.id === link.user_id);
            return {
                ...link,
                user_name: user ? user.full_name : 'Unknown',
                user_email: user ? user.email : 'Unknown'
            };
        });
        
        res.json({
            success: true,
            data: allLinks
        });
        
    } catch (error) {
        console.error('Get all links error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve all links'
        });
    }
});

// ========== ERROR HANDLING ==========
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Endpoint not found',
        path: req.path
    });
});

app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// ========== START SERVER ==========
app.listen(PORT, () => {
    console.log(`
    🚀 Digital Forms API Server Started!
    ⏱️  Port: ${PORT}
    🌐 Environment: ${process.env.NODE_ENV}
    📅 ${new Date().toLocaleString()}
    
    🔗 Health Check: http://localhost:${PORT}/api/health
    🔗 Production: https://digital-forms-api.onrender.com/api/health
    
    📋 API Endpoints:
    ✅ POST /api/auth/login          - User login
    ✅ POST /api/auth/validate       - Validate token
    ✅ POST /api/forms/create-link   - Create form link
    ✅ GET  /api/forms/my-links      - Get user's links
    ✅ POST /api/submissions/submit/:code - Submit form
    ✅ GET  /api/submissions/my-submissions - Get submissions
    ✅ GET  /api/dashboard/stats     - Dashboard statistics
    
    👤 Demo Users:
       Admin:  admin / admin123
       Agent:  agent1 / password123
    
    🌍 Frontend: https://mustafahassann.github.io/digital-forms-system/
    `);
});