const express = require('express');
const { authMiddleware, adminMiddleware } = require('../auth');
const { db } = require('../database');
const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Create new form link
router.post('/create-link', async (req, res) => {
    try {
        const { unit_number, sales_agent, client_email, expiry_days, notes } = req.body;
        
        // Validate required fields
        if (!unit_number || !sales_agent) {
            return res.status(400).json({ 
                message: 'Unit number and sales agent are required' 
            });
        }

        // Create form link
        const result = await db.createFormLink({
            user_id: req.user.userId,
            unit_number,
            sales_agent,
            client_email: client_email || null,
            expiry_days: expiry_days || 14,
            notes: notes || null
        });

        // Log activity
        await db.logActivity({
            user_id: req.user.userId,
            action: 'create_form_link',
            details: `Created form link for ${unit_number}`,
            ip_address: req.ip,
            user_agent: req.get('User-Agent')
        });

        // Construct full URL
        const fullUrl = `${req.protocol}://${req.get('host')}/form/${result.link_code}`;

        res.status(201).json({
            message: 'Form link created successfully',
            link_id: result.id,
            link_code: result.link_code,
            full_url: fullUrl
        });

    } catch (error) {
        console.error('Create form link error:', error);
        res.status(500).json({ message: 'Failed to create form link' });
    }
});

// Get user's form links
router.get('/my-links', async (req, res) => {
    try {
        const links = await db.getUserFormLinks(req.user.userId);
        
        // Format dates and add status based on expiry
        const formattedLinks = links.map(link => {
            const now = new Date();
            const expiresAt = new Date(link.expires_at);
            let status = link.status;
            
            if (status === 'active' && expiresAt < now) {
                status = 'expired';
            }
            
            return {
                ...link,
                status,
                is_expired: expiresAt < now
            };
        });

        res.json({ links: formattedLinks });
    } catch (error) {
        console.error('Get links error:', error);
        res.status(500).json({ message: 'Failed to retrieve form links' });
    }
});

// Get specific form link
router.get('/link/:linkCode', async (req, res) => {
    try {
        const link = await db.getFormLinkByCode(req.params.linkCode);
        
        if (!link) {
            return res.status(404).json({ message: 'Form link not found' });
        }

        // Check if user has permission (admin or owner)
        if (req.user.role !== 'admin' && link.user_id !== req.user.userId) {
            return res.status(403).json({ message: 'Access denied' });
        }

        res.json({ link });
    } catch (error) {
        console.error('Get link error:', error);
        res.status(500).json({ message: 'Failed to retrieve form link' });
    }
});

// Update form link
router.put('/link/:linkId', async (req, res) => {
    try {
        const { unit_number, sales_agent, status } = req.body;
        
        // First, verify ownership
        const link = await new Promise((resolve, reject) => {
            db.db.get("SELECT user_id FROM form_links WHERE id = ?", [req.params.linkId], (err, row) => {
                if (err) reject(err);
                resolve(row);
            });
        });

        if (!link) {
            return res.status(404).json({ message: 'Form link not found' });
        }

        if (req.user.role !== 'admin' && link.user_id !== req.user.userId) {
            return res.status(403).json({ message: 'Access denied' });
        }

        // Build update query
        const updates = [];
        const params = [];
        
        if (unit_number) {
            updates.push('unit_number = ?');
            params.push(unit_number);
        }
        
        if (sales_agent) {
            updates.push('sales_agent = ?');
            params.push(sales_agent);
        }
        
        if (status) {
            updates.push('status = ?');
            params.push(status);
        }
        
        if (updates.length === 0) {
            return res.status(400).json({ message: 'No updates provided' });
        }
        
        params.push(req.params.linkId);
        
        const query = `UPDATE form_links SET ${updates.join(', ')} WHERE id = ?`;
        
        await new Promise((resolve, reject) => {
            db.db.run(query, params, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        // Log activity
        await db.logActivity({
            user_id: req.user.userId,
            action: 'update_form_link',
            details: `Updated form link ${req.params.linkId}`,
            ip_address: req.ip,
            user_agent: req.get('User-Agent')
        });

        res.json({ message: 'Form link updated successfully' });
    } catch (error) {
        console.error('Update link error:', error);
        res.status(500).json({ message: 'Failed to update form link' });
    }
});

// Delete form link
router.delete('/link/:linkId', async (req, res) => {
    try {
        // Verify ownership
        const link = await new Promise((resolve, reject) => {
            db.db.get("SELECT user_id FROM form_links WHERE id = ?", [req.params.linkId], (err, row) => {
                if (err) reject(err);
                resolve(row);
            });
        });

        if (!link) {
            return res.status(404).json({ message: 'Form link not found' });
        }

        if (req.user.role !== 'admin' && link.user_id !== req.user.userId) {
            return res.status(403).json({ message: 'Access denied' });
        }

        // Soft delete by setting status to 'deleted'
        await new Promise((resolve, reject) => {
            db.db.run(
                "UPDATE form_links SET status = 'deleted' WHERE id = ?",
                [req.params.linkId],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });

        // Log activity
        await db.logActivity({
            user_id: req.user.userId,
            action: 'delete_form_link',
            details: `Deleted form link ${req.params.linkId}`,
            ip_address: req.ip,
            user_agent: req.get('User-Agent')
        });

        res.json({ message: 'Form link deleted successfully' });
    } catch (error) {
        console.error('Delete link error:', error);
        res.status(500).json({ message: 'Failed to delete form link' });
    }
});

// Admin routes
router.get('/all-links', adminMiddleware, async (req, res) => {
    try {
        const links = await db.getAllFormLinks();
        res.json({ links });
    } catch (error) {
        console.error('Get all links error:', error);
        res.status(500).json({ message: 'Failed to retrieve form links' });
    }
});

module.exports = router;