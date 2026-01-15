const express = require('express');
const { authMiddleware, adminMiddleware } = require('../auth');
const { db } = require('../database');
const router = express.Router();

// All routes require authentication except public submission
router.use(authMiddleware);

// Get user's form submissions
router.get('/my-submissions', async (req, res) => {
    try {
        const submissions = await db.getUserSubmissions(req.user.userId);
        
        // Parse submission data
        const formattedSubmissions = submissions.map(sub => ({
            ...sub,
            submission_data: JSON.parse(sub.submission_data)
        }));

        res.json({ submissions: formattedSubmissions });
    } catch (error) {
        console.error('Get submissions error:', error);
        res.status(500).json({ message: 'Failed to retrieve form submissions' });
    }
});

// Get specific submission
router.get('/submission/:submissionId', async (req, res) => {
    try {
        const submission = await new Promise((resolve, reject) => {
            db.db.get(
                `SELECT fs.*, fl.unit_number, fl.sales_agent 
                 FROM form_submissions fs 
                 JOIN form_links fl ON fs.link_id = fl.id 
                 WHERE fs.id = ?`,
                [req.params.submissionId],
                (err, row) => {
                    if (err) reject(err);
                    resolve(row);
                }
            );
        });

        if (!submission) {
            return res.status(404).json({ message: 'Submission not found' });
        }

        // Check permission
        if (req.user.role !== 'admin' && submission.user_id !== req.user.userId) {
            return res.status(403).json({ message: 'Access denied' });
        }

        // Parse submission data
        submission.submission_data = JSON.parse(submission.submission_data);

        res.json({ submission });
    } catch (error) {
        console.error('Get submission error:', error);
        res.status(500).json({ message: 'Failed to retrieve submission' });
    }
});

// Update submission status (review)
router.put('/submission/:submissionId/review', async (req, res) => {
    try {
        const { status, review_notes } = req.body;
        
        if (!status || !['approved', 'rejected', 'pending'].includes(status)) {
            return res.status(400).json({ message: 'Valid status is required' });
        }

        // Check permission
        const submission = await new Promise((resolve, reject) => {
            db.db.get("SELECT user_id FROM form_submissions WHERE id = ?", [req.params.submissionId], (err, row) => {
                if (err) reject(err);
                resolve(row);
            });
        });

        if (!submission) {
            return res.status(404).json({ message: 'Submission not found' });
        }

        if (req.user.role !== 'admin' && submission.user_id !== req.user.userId) {
            return res.status(403).json({ message: 'Access denied' });
        }

        // Update submission
        await new Promise((resolve, reject) => {
            db.db.run(
                `UPDATE form_submissions 
                 SET status = ?, review_notes = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP 
                 WHERE id = ?`,
                [status, review_notes, req.user.userId, req.params.submissionId],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });

        // Log activity
        await db.logActivity({
            user_id: req.user.userId,
            action: 'review_submission',
            details: `Reviewed submission ${req.params.submissionId} as ${status}`,
            ip_address: req.ip,
            user_agent: req.get('User-Agent')
        });

        res.json({ message: 'Submission reviewed successfully' });
    } catch (error) {
        console.error('Review submission error:', error);
        res.status(500).json({ message: 'Failed to review submission' });
    }
});

// Public submission endpoint (no authentication required)
router.post('/submit/:linkCode', async (req, res) => {
    try {
        const { linkCode } = req.params;
        const submissionData = req.body;

        // Validate link exists and is active
        const link = await db.getFormLinkByCode(linkCode);
        
        if (!link) {
            return res.status(404).json({ message: 'Form link is invalid or has expired' });
        }

        // Validate submission data
        if (!submissionData.customer_name || !submissionData.form_data) {
            return res.status(400).json({ message: 'Customer name and form data are required' });
        }

        // Create submission
        const submissionId = await db.createFormSubmission({
            link_id: link.id,
            user_id: link.user_id,
            customer_name: submissionData.customer_name,
            customer_email: submissionData.customer_email,
            submission_data: submissionData.form_data
        });

        // Log activity
        await db.logActivity({
            user_id: link.user_id,
            action: 'form_submission',
            details: `New submission from ${submissionData.customer_name} for ${link.unit_number}`,
            ip_address: req.ip,
            user_agent: req.get('User-Agent')
        });

        res.status(201).json({ 
            message: 'Form submitted successfully',
            submission_id: submissionId
        });
    } catch (error) {
        console.error('Submit form error:', error);
        res.status(500).json({ message: 'Failed to submit form' });
    }
});

// Get dashboard statistics
router.get('/stats', async (req, res) => {
    try {
        const stats = await db.getDashboardStats(req.user.userId, req.user.role);
        res.json({ stats });
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({ message: 'Failed to retrieve statistics' });
    }
});

// Admin routes
router.get('/all-submissions', adminMiddleware, async (req, res) => {
    try {
        const submissions = await db.getAllSubmissions();
        
        // Parse submission data
        const formattedSubmissions = submissions.map(sub => ({
            ...sub,
            submission_data: JSON.parse(sub.submission_data)
        }));

        res.json({ submissions: formattedSubmissions });
    } catch (error) {
        console.error('Get all submissions error:', error);
        res.status(500).json({ message: 'Failed to retrieve submissions' });
    }
});

// Export submissions as CSV (admin only)
router.get('/export/csv', adminMiddleware, async (req, res) => {
    try {
        const submissions = await db.getAllSubmissions();
        
        // Create CSV content
        const headers = ['Submission ID', 'Customer Name', 'Customer Email', 'Unit Number', 
                        'Sales Agent', 'Submitted At', 'Status', 'Agent'];
        
        const csvRows = [
            headers.join(','),
            ...submissions.map(sub => [
                sub.id,
                `"${sub.customer_name.replace(/"/g, '""')}"`,
                sub.customer_email || '',
                `"${sub.unit_number.replace(/"/g, '""')}"`,
                `"${sub.sales_agent.replace(/"/g, '""')}"`,
                sub.submitted_at,
                sub.status,
                sub.agent_username
            ].join(','))
        ];
        
        const csvContent = csvRows.join('\n');
        
        // Set response headers for file download
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=submissions.csv');
        
        res.send(csvContent);
    } catch (error) {
        console.error('Export CSV error:', error);
        res.status(500).json({ message: 'Failed to export submissions' });
    }
});

module.exports = router;