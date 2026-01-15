const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

class Database {
    constructor() {
        this.db = new sqlite3.Database(path.join(__dirname, 'database.sqlite'));
    }

    async initialize() {
        return new Promise((resolve, reject) => {
            this.db.serialize(() => {
                // Users table
                this.db.run(`CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT UNIQUE NOT NULL,
                    password TEXT NOT NULL,
                    email TEXT UNIQUE NOT NULL,
                    full_name TEXT NOT NULL,
                    role TEXT DEFAULT 'agent',
                    department TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    last_login DATETIME,
                    is_active BOOLEAN DEFAULT 1
                )`);

                // Digital form links table
                this.db.run(`CREATE TABLE IF NOT EXISTS form_links (
                    id TEXT PRIMARY KEY,
                    user_id INTEGER NOT NULL,
                    unit_number TEXT NOT NULL,
                    sales_agent TEXT NOT NULL,
                    link_code TEXT UNIQUE NOT NULL,
                    client_email TEXT,
                    expiry_days INTEGER DEFAULT 14,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    expires_at DATETIME,
                    status TEXT DEFAULT 'active',
                    submissions_count INTEGER DEFAULT 0,
                    notes TEXT,
                    FOREIGN KEY (user_id) REFERENCES users(id)
                )`);

                // Form submissions table
                this.db.run(`CREATE TABLE IF NOT EXISTS form_submissions (
                    id TEXT PRIMARY KEY,
                    link_id TEXT NOT NULL,
                    user_id INTEGER NOT NULL,
                    customer_name TEXT NOT NULL,
                    customer_email TEXT,
                    submission_data TEXT NOT NULL,
                    pdf_url TEXT,
                    submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    status TEXT DEFAULT 'pending',
                    review_notes TEXT,
                    reviewed_by INTEGER,
                    reviewed_at DATETIME,
                    FOREIGN KEY (link_id) REFERENCES form_links(id),
                    FOREIGN KEY (user_id) REFERENCES users(id)
                )`);

                // Activity log table
                this.db.run(`CREATE TABLE IF NOT EXISTS activity_log (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER,
                    action TEXT NOT NULL,
                    details TEXT,
                    ip_address TEXT,
                    user_agent TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id)
                )`);

                // Create default admin user if not exists
                this.createDefaultAdmin().then(resolve).catch(reject);
            });
        });
    }

    async createDefaultAdmin() {
        const adminExists = await new Promise((resolve, reject) => {
            this.db.get("SELECT id FROM users WHERE username = 'admin'", (err, row) => {
                if (err) reject(err);
                resolve(!!row);
            });
        });

        if (!adminExists) {
            const hashedPassword = await bcrypt.hash('admin123', 10);
            await new Promise((resolve, reject) => {
                this.db.run(
                    `INSERT INTO users (username, password, email, full_name, role) VALUES (?, ?, ?, ?, ?)`,
                    ['admin', hashedPassword, 'admin@digitalforms.com', 'System Administrator', 'admin'],
                    (err) => {
                        if (err) reject(err);
                        else resolve();
                    }
                );
            });
            console.log('Default admin user created');
        }
    }

    // User methods
    async getUserByUsername(username) {
        return new Promise((resolve, reject) => {
            this.db.get("SELECT * FROM users WHERE username = ? AND is_active = 1", [username], (err, row) => {
                if (err) reject(err);
                resolve(row);
            });
        });
    }

    async createUser(userData) {
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        return new Promise((resolve, reject) => {
            this.db.run(
                `INSERT INTO users (username, password, email, full_name, role, department) VALUES (?, ?, ?, ?, ?, ?)`,
                [userData.username, hashedPassword, userData.email, userData.full_name, userData.role, userData.department],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                }
            );
        });
    }

    // Form link methods
    async createFormLink(linkData) {
        const linkId = require('uuid').v4();
        const linkCode = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
        
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + linkData.expiry_days);
        
        return new Promise((resolve, reject) => {
            this.db.run(
                `INSERT INTO form_links (id, user_id, unit_number, sales_agent, link_code, client_email, expiry_days, expires_at, notes) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [linkId, linkData.user_id, linkData.unit_number, linkData.sales_agent, linkCode, 
                 linkData.client_email, linkData.expiry_days, expiryDate.toISOString(), linkData.notes],
                function(err) {
                    if (err) reject(err);
                    else resolve({ id: linkId, link_code: linkCode });
                }
            );
        });
    }

    async getUserFormLinks(userId) {
        return new Promise((resolve, reject) => {
            this.db.all(
                `SELECT * FROM form_links WHERE user_id = ? ORDER BY created_at DESC`,
                [userId],
                (err, rows) => {
                    if (err) reject(err);
                    resolve(rows);
                }
            );
        });
    }

    async getFormLinkByCode(linkCode) {
        return new Promise((resolve, reject) => {
            this.db.get(
                `SELECT fl.*, u.full_name as user_name 
                 FROM form_links fl 
                 JOIN users u ON fl.user_id = u.id 
                 WHERE fl.link_code = ? AND fl.status = 'active'`,
                [linkCode],
                (err, row) => {
                    if (err) reject(err);
                    resolve(row);
                }
            );
        });
    }

    // Form submission methods
    async createFormSubmission(submissionData) {
        const submissionId = require('uuid').v4();
        
        return new Promise((resolve, reject) => {
            this.db.run(
                `INSERT INTO form_submissions (id, link_id, user_id, customer_name, customer_email, submission_data) 
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [submissionId, submissionData.link_id, submissionData.user_id, 
                 submissionData.customer_name, submissionData.customer_email, 
                 JSON.stringify(submissionData.submission_data)],
                async function(err) {
                    if (err) reject(err);
                    
                    // Update submissions count
                    await this.db.run(
                        `UPDATE form_links SET submissions_count = submissions_count + 1 WHERE id = ?`,
                        [submissionData.link_id]
                    );
                    
                    resolve(submissionId);
                }.bind(this)
            );
        });
    }

    async getUserSubmissions(userId) {
        return new Promise((resolve, reject) => {
            this.db.all(
                `SELECT fs.*, fl.unit_number, fl.sales_agent 
                 FROM form_submissions fs 
                 JOIN form_links fl ON fs.link_id = fl.id 
                 WHERE fs.user_id = ? 
                 ORDER BY fs.submitted_at DESC`,
                [userId],
                (err, rows) => {
                    if (err) reject(err);
                    resolve(rows);
                }
            );
        });
    }

    // Activity logging
    async logActivity(activityData) {
        return new Promise((resolve, reject) => {
            this.db.run(
                `INSERT INTO activity_log (user_id, action, details, ip_address, user_agent) 
                 VALUES (?, ?, ?, ?, ?)`,
                [activityData.user_id, activityData.action, activityData.details, 
                 activityData.ip_address, activityData.user_agent],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    }

    // Admin methods
    async getAllUsers() {
        return new Promise((resolve, reject) => {
            this.db.all(
                `SELECT id, username, email, full_name, role, department, created_at, last_login, is_active 
                 FROM users WHERE role != 'admin' 
                 ORDER BY created_at DESC`,
                (err, rows) => {
                    if (err) reject(err);
                    resolve(rows);
                }
            );
        });
    }

    async getAllFormLinks() {
        return new Promise((resolve, reject) => {
            this.db.all(
                `SELECT fl.*, u.username, u.full_name as user_name 
                 FROM form_links fl 
                 JOIN users u ON fl.user_id = u.id 
                 ORDER BY fl.created_at DESC`,
                (err, rows) => {
                    if (err) reject(err);
                    resolve(rows);
                }
            );
        });
    }

    async getAllSubmissions() {
        return new Promise((resolve, reject) => {
            this.db.all(
                `SELECT fs.*, fl.unit_number, fl.sales_agent, u.username as agent_username 
                 FROM form_submissions fs 
                 JOIN form_links fl ON fs.link_id = fl.id 
                 JOIN users u ON fs.user_id = u.id 
                 ORDER BY fs.submitted_at DESC`,
                (err, rows) => {
                    if (err) reject(err);
                    resolve(rows);
                }
            );
        });
    }

    // Statistics
    async getDashboardStats(userId, role) {
        let userStatsQuery = '';
        let params = [];
        
        if (role === 'admin') {
            userStatsQuery = `
                SELECT 
                    (SELECT COUNT(*) FROM form_links) as total_links,
                    (SELECT COUNT(*) FROM form_submissions) as total_submissions,
                    (SELECT COUNT(*) FROM form_submissions WHERE status = 'pending') as pending_submissions,
                    (SELECT COUNT(*) FROM users WHERE is_active = 1 AND role != 'admin') as active_agents
            `;
        } else {
            userStatsQuery = `
                SELECT 
                    (SELECT COUNT(*) FROM form_links WHERE user_id = ?) as total_links,
                    (SELECT COUNT(*) FROM form_submissions WHERE user_id = ?) as total_submissions,
                    (SELECT COUNT(*) FROM form_submissions WHERE user_id = ? AND status = 'pending') as pending_submissions,
                    0 as active_agents
            `;
            params = [userId, userId, userId];
        }
        
        return new Promise((resolve, reject) => {
            this.db.get(userStatsQuery, params, (err, row) => {
                if (err) reject(err);
                resolve(row);
            });
        });
    }

    close() {
        this.db.close();
    }
}

const db = new Database();

module.exports = {
    db,
    initializeDatabase: async () => {
        await db.initialize();
        return db;
    }
};