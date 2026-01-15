// ========== DIGITAL FORMS BACKEND API ==========
// Simple, working version for Render
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 10000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-123';

// ========== MIDDLEWARE ==========
// Allow all origins for now (we'll restrict later)
app.use(cors({
    origin: '*',
    credentials: true
}));

// Parse JSON
app.use(express.json());

// ========== SIMPLE DATABASE (in-memory) ==========
const users = [
    {
        id: 1,
        username: 'admin',
        password: '$2a$10$XyZ/ABC123DEF456GHI789.JKLMNOPQRSTUVWXYZ012345', // admin123
        email: 'admin@digitalforms.com',
        full_name: 'System Administrator',
        role: 'admin',
        department: 'Management'
    },
    {
        id: 2,
        username: 'agent1',
        password: '$2a$10$XyZ/ABC123DEF456GHI789.JKLMNOPQRSTUVWXYZ012345', // password123
        email: 'agent1@company.com',
        full_name: 'John Smith',
        role: 'agent',
        department: 'Sales'
    }
];

// Mock database
const formLinks = [];
const submissions = [];

// ========== HEALTH CHECK ==========
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'Digital Forms API is running',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// ========== AUTHENTICATION ==========
// Login endpoint
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        console.log('Login attempt for:', username);
        
        // Find user
        const user = users.find(u => u.username === username);
        
        if (!user) {
            return res.status(401).json({
                message: 'Invalid username or password'
            });
        }
        
        // For demo, accept any password that matches "admin123" or "password123"
        // In production, use: const isValid = await bcrypt.compare(password, user.password);
        const isValid = (username === 'admin' && password === 'admin123') || 
                       (username === 'agent1' && password === 'password123');
        
        if (!isValid) {
            return res.status(401).json({
                message: 'Invalid username or password'
            });
        }
        
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
        
        // Return user data (without password)
        const { password: _, ...userWithoutPassword } = user;
        
        res.json({
            message: 'Login successful',
            token,
            user: userWithoutPassword
        });
        
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            message: 'Server error during login'
        });
    }
});

// ========== FORM LINKS ==========
// Create form link
app.post('/api/forms/create-link', (req, res) => {
    try {
        const { unit_number, sales_agent } = req.body;
        const user = { id: 1 }; // Mock user from JWT
        
        if (!unit_number || !sales_agent) {
            return res.status(400).json({
                message: 'Unit number and sales agent are required'
            });
        }
        
        // Generate unique link code
        const linkCode = Math.random().toString(36).substring(2, 15);
        const linkId = 'link_' + Date.now();
        
        const newLink = {
            id: linkId,
            user_id: user.id,
            unit_number,
            sales_agent,
            link_code: linkCode,
            created_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days
            status: 'active',
            submissions_count: 0
        };
        
        formLinks.push(newLink);
        
        // Construct full URL
        const fullUrl = `${req.protocol}://${req.get('host')}/form/${linkCode}`;
        
        res.status(201).json({
            message: 'Form link created successfully',
            link: {
                id: newLink.id,
                link_code: newLink.link_code,
                full_url: `https://vipulchhabra1.github.io/digital-forms-system/form.html?code=${linkCode}`,
                unit_number: newLink.unit_number,
                sales_agent: newLink.sales_agent
            }
        });
        
    } catch (error) {
        console.error('Create link error:', error);
        res.status(500).json({
            message: 'Failed to create form link'
        });
    }
});

// Get user's form links
app.get('/api/forms/my-links', (req, res) => {
    try {
        const user = { id: 1 }; // Mock user
        
        const userLinks = formLinks.filter(link => link.user_id === user.id);
        
        res.json({
            links: userLinks
        });
        
    } catch (error) {
        console.error('Get links error:', error);
        res.status(500).json({
            message: 'Failed to retrieve form links'
        });
    }
});

// ========== FORM SUBMISSIONS ==========
// Submit form (public endpoint)
app.post('/api/submissions/submit/:linkCode', (req, res) => {
    try {
        const { linkCode } = req.params;
        const submissionData = req.body;
        
        // Find link
        const link = formLinks.find(l => l.link_code === linkCode);
        
        if (!link) {
            return res.status(404).json({
                message: 'Form link not found or expired'
            });
        }
        
        // Create submission
        const submissionId = 'sub_' + Date.now();
        
        const newSubmission = {
            id: submissionId,
            link_id: link.id,
            user_id: link.user_id,
            customer_name: submissionData.customer_name || 'Anonymous',
            customer_email: submissionData.customer_email,
            submission_data: submissionData,
            submitted_at: new Date().toISOString(),
            status: 'pending',
            unit_number: link.unit_number,
            sales_agent: link.sales_agent
        };
        
        submissions.push(newSubmission);
        
        // Update link count
        link.submissions_count = (link.submissions_count || 0) + 1;
        
        res.status(201).json({
            message: 'Form submitted successfully',
            submission_id: submissionId
        });
        
    } catch (error) {
        console.error('Submit error:', error);
        res.status(500).json({
            message: 'Failed to submit form'
        });
    }
});

// Get user's submissions
app.get('/api/submissions/my-submissions', (req, res) => {
    try {
        const user = { id: 1 }; // Mock user
        
        const userSubmissions = submissions.filter(sub => sub.user_id === user.id);
        
        res.json({
            submissions: userSubmissions
        });
        
    } catch (error) {
        console.error('Get submissions error:', error);
        res.status(500).json({
            message: 'Failed to retrieve submissions'
        });
    }
});

// ========== DASHBOARD STATS ==========
app.get('/api/submissions/stats', (req, res) => {
    try {
        const user = { id: 1 }; // Mock user
        
        const userLinks = formLinks.filter(link => link.user_id === user.id);
        const userSubmissions = submissions.filter(sub => sub.user_id === user.id);
        
        res.json({
            stats: {
                total_links: userLinks.length,
                total_submissions: userSubmissions.length,
                pending_submissions: userSubmissions.filter(s => s.status === 'pending').length,
                active_agents: 1
            }
        });
        
    } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({
            message: 'Failed to get statistics'
        });
    }
});

// ========== ROOT ENDPOINT ==========
app.get('/', (req, res) => {
    res.json({
        service: 'Digital Forms Management System API',
        endpoints: [
            'GET  /api/health',
            'POST /api/auth/login',
            'POST /api/forms/create-link',
            'GET  /api/forms/my-links',
            'POST /api/submissions/submit/:code',
            'GET  /api/submissions/my-submissions',
            'GET  /api/submissions/stats'
        ],
        documentation: 'See GitHub repository for details'
    });
});

// ========== START SERVER ==========
app.listen(PORT, () => {
    console.log(`
    🚀 Digital Forms API Server Started!
    ⏱️  Port: ${PORT}
    🌐 Environment: ${process.env.NODE_ENV || 'development'}
    📅 ${new Date().toLocaleString()}
    
    📋 Available Endpoints:
    ✅ GET  /api/health - Health check
    ✅ POST /api/auth/login - User login
    ✅ POST /api/forms/create-link - Create form link
    ✅ GET  /api/forms/my-links - Get user's form links
    ✅ POST /api/submissions/submit/:code - Submit form
    ✅ GET  /api/submissions/my-submissions - Get submissions
    ✅ GET  /api/submissions/stats - Dashboard statistics
    
    🔗 Test login with:
       Username: admin
       Password: admin123
    `);
});