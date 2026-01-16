// ========== DIGITAL FORMS MANAGEMENT SYSTEM API - PRODUCTION READY ==========
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 10000;
const JWT_SECRET = process.env.JWT_SECRET || 'digital-forms-secret-9981914207450975975';

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

// Logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
    next();
});

// ========== AUTHENTICATION MIDDLEWARE ==========
const authenticate = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ 
                success: false, 
                message: 'Authentication required' 
            });
        }
        
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ 
            success: false, 
            message: 'Invalid or expired token' 
        });
    }
};

const isAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ 
            success: false, 
            message: 'Admin access required' 
        });
    }
    next();
};

// ========== IN-MEMORY DATABASE ==========
// Users database with hashed passwords
const users = [
    {
        id: 1,
        username: 'admin',
        password: bcrypt.hashSync('admin123', 10),
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
        password: bcrypt.hashSync('password123', 10),
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

// Helper functions
const logActivity = (userId, action, details) => {
    activityLogs.push({
        id: Date.now(),
        user_id: userId,
        action,
        details,
        timestamp: new Date().toISOString()
    });
};

// ========== HEALTH CHECK (REQUIRED FOR RENDER) ==========
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        status: 'OK',
        message: 'Digital Forms API is running',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'production',
        stats: {
            users: users.length,
            formLinks: formLinks.length,
            submissions: submissions.length
        }
    });
});

// ========== AUTHENTICATION ENDPOINTS ==========
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: 'Username and password are required'
            });
        }
        
        const user = users.find(u => u.username === username && u.is_active);
        
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }
        
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }
        
        // Update last login
        user.last_login = new Date().toISOString();
        
        // Create token
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
        
        logActivity(user.id, 'login', 'User logged in');
        
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

app.post('/api/auth/change-password', authenticate, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        
        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Current password and new password are required'
            });
        }
        
        const user = users.find(u => u.id === req.user.userId);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        const validPassword = await bcrypt.compare(currentPassword, user.password);
        if (!validPassword) {
            return res.status(400).json({
                success: false,
                message: 'Current password is incorrect'
            });
        }
        
        // Hash new password
        user.password = await bcrypt.hash(newPassword, 10);
        
        logActivity(user.id, 'change_password', 'User changed password');
        
        res.json({
            success: true,
            message: 'Password updated successfully'
        });
        
    } catch (error) {
        console.error('Change password error:', error);
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

// ========== FORM MANAGEMENT ==========
app.post('/api/forms/create-link', authenticate, (req, res) => {
    try {
        const { unit_number, sales_agent, client_email, expiry_days, notes } = req.body;
        
        if (!unit_number || !sales_agent) {
            return res.status(400).json({
                success: false,
                message: 'Unit number and sales agent are required'
            });
        }
        
        // Generate unique link code
        const linkCode = Math.random().toString(36).substring(2, 10) + 
                        Math.random().toString(36).substring(2, 10);
        
        const linkId = `link_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
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
        
        logActivity(req.user.userId, 'create_link', `Created form link for ${unit_number}`);
        
        // Generate form with custom header
        const formUrl = `https://mustafahassann.github.io/digital-forms-system/form.html?code=${linkCode}&unit=${encodeURIComponent(unit_number)}&agent=${encodeURIComponent(sales_agent)}`;
        
        res.status(201).json({
            success: true,
            message: 'Form link created successfully',
            data: {
                id: linkId,
                link_code: linkCode,
                full_url: formUrl,
                unit_number,
                sales_agent,
                expires_at: expiryDate.toISOString(),
                created_at: new Date().toISOString()
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
        const userLinks = formLinks.filter(link => link.user_id === req.user.userId);
        
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

// ========== FORM SUBMISSION ==========
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
        
        const link = formLinks.find(l => l.link_code === linkCode);
        
        if (!link) {
            return res.status(404).json({
                success: false,
                message: 'Form link not found or expired'
            });
        }
        
        if (new Date(link.expires_at) < new Date()) {
            return res.status(400).json({
                success: false,
                message: 'Form link has expired'
            });
        }
        
        const submissionId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const submission = {
            id: submissionId,
            link_id: link.id,
            user_id: link.user_id,
            customer_name,
            customer_email: customer_email || null,
            submission_data: form_data,
            submitted_at: new Date().toISOString(),
            status: 'pending',
            unit_number: link.unit_number,
            sales_agent: link.sales_agent
        };
        
        submissions.push(submission);
        
        link.submissions_count = (link.submissions_count || 0) + 1;
        
        logActivity(link.user_id, 'form_submission', `New submission from ${customer_name} for ${link.unit_number}`);
        
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
        const userSubmissions = submissions.filter(sub => sub.user_id === req.user.userId);
        
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

// ========== DASHBOARD STATISTICS ==========
app.get('/api/dashboard/stats', authenticate, (req, res) => {
    try {
        const userLinks = formLinks.filter(link => link.user_id === req.user.userId);
        const userSubmissions = submissions.filter(sub => sub.user_id === req.user.userId);
        const expiredLinks = userLinks.filter(link => new Date(link.expires_at) < new Date()).length;
        
        const stats = {
            total_links: userLinks.length,
            active_links: userLinks.filter(link => new Date(link.expires_at) >= new Date()).length,
            expired_links: expiredLinks,
            total_submissions: userSubmissions.length,
            pending_submissions: userSubmissions.filter(sub => sub.status === 'pending').length
        };
        
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

// ========== USER MANAGEMENT (ADMIN ONLY) ==========
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

app.post('/api/admin/users', authenticate, isAdmin, async (req, res) => {
    try {
        const { username, email, full_name, role, department, password } = req.body;
        
        if (!username || !email || !full_name || !role || !password) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required'
            });
        }
        
        if (users.find(u => u.username === username)) {
            return res.status(400).json({
                success: false,
                message: 'Username already exists'
            });
        }
        
        if (users.find(u => u.email === email)) {
            return res.status(400).json({
                success: false,
                message: 'Email already exists'
            });
        }
        
        const newUser = {
            id: users.length + 1,
            username,
            email,
            full_name,
            role,
            department: department || null,
            password: await bcrypt.hash(password, 10),
            is_active: true,
            created_at: new Date().toISOString(),
            last_login: null
        };
        
        users.push(newUser);
        
        logActivity(req.user.userId, 'create_user', `Created user: ${username}`);
        
        const { password: _, ...userData } = newUser;
        
        res.status(201).json({
            success: true,
            message: 'User created successfully',
            data: userData
        });
        
    } catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create user'
        });
    }
});

app.put('/api/admin/users/:userId', authenticate, isAdmin, async (req, res) => {
    try {
        const userId = parseInt(req.params.userId);
        const { email, full_name, role, department, is_active, password } = req.body;
        
        const user = users.find(u => u.id === userId);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        if (email !== undefined) user.email = email;
        if (full_name !== undefined) user.full_name = full_name;
        if (role !== undefined) user.role = role;
        if (department !== undefined) user.department = department;
        if (is_active !== undefined) user.is_active = is_active;
        
        if (password) {
            user.password = await bcrypt.hash(password, 10);
        }
        
        logActivity(req.user.userId, 'update_user', `Updated user: ${user.username}`);
        
        const { password: _, ...userData } = user;
        
        res.json({
            success: true,
            message: 'User updated successfully',
            data: userData
        });
        
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update user'
        });
    }
});

app.delete('/api/admin/users/:userId', authenticate, isAdmin, (req, res) => {
    try {
        const userId = parseInt(req.params.userId);
        
        if (userId === req.user.userId) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete your own account'
            });
        }
        
        const userIndex = users.findIndex(u => u.id === userId);
        
        if (userIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        const user = users[userIndex];
        users[userIndex].is_active = false;
        
        logActivity(req.user.userId, 'delete_user', `Deleted user: ${user.username}`);
        
        res.json({
            success: true,
            message: 'User deleted successfully'
        });
        
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete user'
        });
    }
});

// ========== ROOT ENDPOINT ==========
app.get('/', (req, res) => {
    res.json({
        service: 'Digital Forms Management System API',
        status: 'running',
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'production',
        endpoints: {
            health: 'GET /api/health',
            login: 'POST /api/auth/login',
            change_password: 'POST /api/auth/change-password',
            create_link: 'POST /api/forms/create-link',
            my_links: 'GET /api/forms/my-links',
            submit_form: 'POST /api/submissions/submit/:code',
            my_submissions: 'GET /api/submissions/my-submissions',
            dashboard_stats: 'GET /api/dashboard/stats',
            admin_users: 'GET /api/admin/users'
        },
        timestamp: new Date().toISOString()
    });
});

// ========== 404 HANDLER ==========
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        path: req.path,
        method: req.method
    });
});

// ========== ERROR HANDLER ==========
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: err.message
    });
});

// ========== START SERVER ==========
app.listen(PORT, () => {
    console.log(`
    🚀 Digital Forms API Server Started!
    ⏱️  Port: ${PORT}
    🌐 Environment: ${process.env.NODE_ENV || 'production'}
    🔑 JWT Secret: ${JWT_SECRET ? 'Set' : 'Default'}
    📅 ${new Date().toLocaleString()}
    
    📋 Available Endpoints:
    ✅ GET  /api/health          - Health check
    ✅ POST /api/auth/login      - User login
    ✅ POST /api/auth/change-password - Change password
    ✅ POST /api/forms/create-link - Create form link
    ✅ GET  /api/forms/my-links  - Get user's links
    ✅ POST /api/submissions/submit/:code - Submit form
    ✅ GET  /api/submissions/my-submissions - Get submissions
    ✅ GET  /api/dashboard/stats - Dashboard statistics
    ✅ GET  /api/admin/users     - Admin: Get all users
    ✅ POST /api/admin/users     - Admin: Create user
    ✅ PUT  /api/admin/users/:id - Admin: Update user
    ✅ DELETE /api/admin/users/:id - Admin: Delete user
    
    🔐 Demo Users:
       Admin:  admin / admin123
       Agent:  agent1 / password123
    `);
});

module.exports = app;