// ========== DIGITAL FORMS DASHBOARD ==========

// Configuration
const API_BASE_URL = 'https://digital-forms-api.onrender.com/api';

// State
let currentUser = null;
let dashboardStats = null;
let formLinks = [];
let submissions = [];

// ========== INITIALIZATION ==========
document.addEventListener('DOMContentLoaded', async function() {
    console.log('📊 Dashboard initializing...');
    
    // Check authentication
    if (!await checkAuthentication()) {
        return;
    }
    
    // Initialize dashboard
    await initializeDashboard();
    
    // Set up event listeners
    setupEventListeners();
    
    console.log('✅ Dashboard initialized');
});

// Check authentication
async function checkAuthentication() {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (!token || !userData) {
        console.log('❌ No authentication data found');
        window.location.href = 'index.html';
        return false;
    }
    
    try {
        // Validate token with backend
        const isValid = await validateToken(token);
        
        if (!isValid) {
            console.log('❌ Token validation failed');
            localStorage.clear();
            window.location.href = 'index.html';
            return false;
        }
        
        currentUser = JSON.parse(userData);
        console.log('👤 Current user:', currentUser);
        return true;
        
    } catch (error) {
        console.error('Authentication error:', error);
        localStorage.clear();
        window.location.href = 'index.html';
        return false;
    }
}

// Validate token
async function validateToken(token) {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/validate`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        return data.success === true;
    } catch (error) {
        console.error('Token validation error:', error);
        return false;
    }
}

// Initialize dashboard
async function initializeDashboard() {
    showLoading(true);
    
    try {
        // Load all dashboard data
        await Promise.all([
            loadDashboardStats(),
            loadFormLinks(),
            loadSubmissions()
        ]);
        
        // Update UI
        updateUserInfo();
        updateStatsDisplay();
        updateRecentActivity();
        
        // Show dashboard content
        document.getElementById('dashboard').style.display = 'block';
        
    } catch (error) {
        console.error('Error initializing dashboard:', error);
        showAlert('error', 'Failed to load dashboard data');
    } finally {
        showLoading(false);
    }
}

// ========== DATA LOADING ==========
async function loadDashboardStats() {
    try {
        const token = localStorage.getItem('token');
        
        const response = await fetch(`${API_BASE_URL}/dashboard/stats`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            dashboardStats = data.data;
            console.log('📈 Dashboard stats loaded:', dashboardStats);
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

async function loadFormLinks() {
    try {
        const token = localStorage.getItem('token');
        
        const response = await fetch(`${API_BASE_URL}/forms/my-links`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            formLinks = data.data || [];
            console.log('🔗 Form links loaded:', formLinks.length);
        }
    } catch (error) {
        console.error('Error loading form links:', error);
    }
}

async function loadSubmissions() {
    try {
        const token = localStorage.getItem('token');
        
        const response = await fetch(`${API_BASE_URL}/submissions/my-submissions`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            submissions = data.data || [];
            console.log('📄 Submissions loaded:', submissions.length);
        }
    } catch (error) {
        console.error('Error loading submissions:', error);
    }
}

// ========== UI UPDATES ==========
function updateUserInfo() {
    if (!currentUser) return;
    
    const userInfoDiv = document.getElementById('currentUserInfo');
    if (userInfoDiv) {
        const initials = currentUser.full_name 
            ? currentUser.full_name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)
            : currentUser.username.substring(0, 2).toUpperCase();
        
        userInfoDiv.innerHTML = `
            <div class="user-avatar">${initials}</div>
            <div class="user-details">
                <div class="user-name">${currentUser.full_name || currentUser.username}</div>
                <div class="user-role">${currentUser.role.toUpperCase()}</div>
            </div>
        `;
    }
    
    // Show admin menu if admin
    if (currentUser.role === 'admin') {
        const adminMenu = document.getElementById('adminMenu');
        if (adminMenu) {
            adminMenu.style.display = 'block';
        }
    }
}

function updateStatsDisplay() {
    if (!dashboardStats) return;
    
    // Update stats cards
    const totalLinksEl = document.getElementById('totalLinks');
    const totalSubmissionsEl = document.getElementById('totalSubmissions');
    const pendingSubmissionsEl = document.getElementById('pendingSubmissions');
    const expiredLinksEl = document.getElementById('expiredLinks');
    
    if (totalLinksEl) totalLinksEl.textContent = dashboardStats.total_links || 0;
    if (totalSubmissionsEl) totalSubmissionsEl.textContent = dashboardStats.total_submissions || 0;
    if (pendingSubmissionsEl) pendingSubmissionsEl.textContent = dashboardStats.pending_submissions || 0;
    if (expiredLinksEl) expiredLinksEl.textContent = dashboardStats.expired_links || 0;
    
    // Update links count in sidebar
    const linksCountEl = document.getElementById('linksCount');
    if (linksCountEl) {
        linksCountEl.textContent = formLinks.length;
    }
    
    // Update submissions count in sidebar
    const submissionsCountEl = document.getElementById('submissionsCount');
    if (submissionsCountEl) {
        submissionsCountEl.textContent = submissions.length;
    }
}

function updateRecentActivity() {
    const activityDiv = document.getElementById('recentActivity');
    if (!activityDiv) return;
    
    // Combine recent activities
    const activities = [];
    
    // Add recent form links
    formLinks.slice(0, 5).forEach(link => {
        activities.push({
            type: 'link',
            message: `Created link for ${link.unit_number}`,
            time: new Date(link.created_at),
            icon: 'fa-link'
        });
    });
    
    // Add recent submissions
    submissions.slice(0, 5).forEach(sub => {
        activities.push({
            type: 'submission',
            message: `New submission from ${sub.customer_name}`,
            time: new Date(sub.submitted_at),
            icon: 'fa-file-alt'
        });
    });
    
    // Sort by time
    activities.sort((a, b) => b.time - a.time);
    
    // Display
    if (activities.length === 0) {
        activityDiv.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #7f8c8d;">
                <i class="fas fa-inbox" style="font-size: 48px; opacity: 0.3;"></i>
                <p style="margin-top: 15px;">No recent activity</p>
            </div>
        `;
        return;
    }
    
    let html = '<div style="max-height: 400px; overflow-y: auto;">';
    activities.slice(0, 10).forEach(activity => {
        const timeAgo = getTimeAgo(activity.time);
        html += `
            <div style="padding: 12px; border-bottom: 1px solid #eee; display: flex; align-items: center; gap: 12px;">
                <div style="width: 36px; height: 36px; border-radius: 50%; background: #f8f9fa; 
                          display: flex; align-items: center; justify-content: center; color: #3498db;">
                    <i class="fas ${activity.icon}"></i>
                </div>
                <div style="flex: 1;">
                    <div style="font-weight: 500; color: #2c3e50;">${activity.message}</div>
                    <div style="font-size: 12px; color: #95a5a6;">${timeAgo}</div>
                </div>
            </div>
        `;
    });
    html += '</div>';
    
    activityDiv.innerHTML = html;
}

function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    
    let interval = Math.floor(seconds / 31536000);
    if (interval >= 1) return interval + ' year' + (interval > 1 ? 's' : '') + ' ago';
    
    interval = Math.floor(seconds / 2592000);
    if (interval >= 1) return interval + ' month' + (interval > 1 ? 's' : '') + ' ago';
    
    interval = Math.floor(seconds / 86400);
    if (interval >= 1) return interval + ' day' + (interval > 1 ? 's' : '') + ' ago';
    
    interval = Math.floor(seconds / 3600);
    if (interval >= 1) return interval + ' hour' + (interval > 1 ? 's' : '') + ' ago';
    
    interval = Math.floor(seconds / 60);
    if (interval >= 1) return interval + ' minute' + (interval > 1 ? 's' : '') + ' ago';
    
    return 'Just now';
}

// ========== FORM LINK GENERATION ==========
function showGenerateLinkModal() {
    const modal = document.getElementById('generateLinkModal');
    if (modal) {
        modal.style.display = 'flex';
        
        // Set default sales agent
        const salesAgentInput = document.getElementById('salesAgent');
        if (salesAgentInput && currentUser) {
            salesAgentInput.value = currentUser.full_name || currentUser.username;
        }
        
        // Focus on unit number
        setTimeout(() => {
            document.getElementById('unitNumber').focus();
        }, 100);
    }
}

async function generateFormLink() {
    const unitNumber = document.getElementById('unitNumber').value.trim();
    const salesAgent = document.getElementById('salesAgent').value.trim();
    const clientEmail = document.getElementById('clientEmail').value.trim();
    const expiryDays = document.getElementById('expiryDays').value;
    const formNotes = document.getElementById('formNotes').value.trim();
    
    if (!unitNumber || !salesAgent) {
        showAlert('error', 'Unit number and sales agent are required');
        return;
    }
    
    showLoading(true);
    
    try {
        const token = localStorage.getItem('token');
        
        const response = await fetch(`${API_BASE_URL}/forms/create-link`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                unit_number: unitNumber,
                sales_agent: salesAgent,
                client_email: clientEmail || null,
                expiry_days: parseInt(expiryDays) || 14,
                notes: formNotes || null
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Show success modal with link
            showGeneratedLink(data.data);
            
            // Reset form
            document.getElementById('generateForm').reset();
            
            // Reload data
            await Promise.all([
                loadDashboardStats(),
                loadFormLinks()
            ]);
            
            updateStatsDisplay();
            updateRecentActivity();
            
        } else {
            showAlert('error', data.message || 'Failed to create form link');
        }
        
    } catch (error) {
        console.error('Generate link error:', error);
        showAlert('error', 'Network error. Please try again.');
    } finally {
        showLoading(false);
    }
}

function showGeneratedLink(linkData) {
    const modal = document.getElementById('linkGeneratedModal');
    if (!modal) return;
    
    // Update modal content
    const linkInput = document.getElementById('generatedLink');
    const linkDetails = document.getElementById('linkDetails');
    
    if (linkInput) {
        linkInput.value = linkData.full_url;
    }
    
    if (linkDetails) {
        linkDetails.innerHTML = `
            <strong>Unit Number:</strong> ${linkData.unit_number}<br>
            <strong>Sales Agent:</strong> ${linkData.sales_agent}<br>
            <strong>Link Code:</strong> ${linkData.link_code}<br>
            <strong>Expires:</strong> ${new Date(linkData.expires_at).toLocaleDateString()}
        `;
    }
    
    // Close create modal and open success modal
    closeModal('generateLinkModal');
    modal.style.display = 'flex';
}

function copyLink() {
    const linkInput = document.getElementById('generatedLink');
    if (!linkInput) return;
    
    linkInput.select();
    linkInput.setSelectionRange(0, 99999);
    
    navigator.clipboard.writeText(linkInput.value)
        .then(() => {
            showAlert('success', 'Link copied to clipboard!');
        })
        .catch(err => {
            console.error('Failed to copy:', err);
            showAlert('error', 'Failed to copy link');
        });
}

// ========== NAVIGATION ==========
function showSection(section) {
    // Update active menu
    document.querySelectorAll('.sidebar-menu a').forEach(link => {
        link.classList.remove('active');
    });
    
    const menuItem = document.querySelector(`[onclick="showSection('${section}')"]`);
    if (menuItem) {
        menuItem.classList.add('active');
    }
    
    // Load section content
    const contentArea = document.getElementById('contentArea');
    
    switch(section) {
        case 'dashboard':
            contentArea.innerHTML = getDashboardHTML();
            updateStatsDisplay();
            updateRecentActivity();
            break;
            
        case 'createLink':
            contentArea.innerHTML = getCreateLinkHTML();
            break;
            
        case 'myLinks':
            contentArea.innerHTML = getMyLinksHTML();
            loadAndDisplayLinks();
            break;
            
        case 'submissions':
            contentArea.innerHTML = getSubmissionsHTML();
            loadAndDisplaySubmissions();
            break;
            
        case 'admin':
            if (currentUser.role === 'admin') {
                contentArea.innerHTML = getAdminHTML();
            }
            break;
            
        case 'settings':
            contentArea.innerHTML = getSettingsHTML();
            break;
    }
}

function getDashboardHTML() {
    return `
        <div class="page-title">
            <h1><i class="fas fa-tachometer-alt"></i> Dashboard</h1>
            <div class="header-actions">
                <button class="btn btn-primary" onclick="showGenerateLinkModal()">
                    <i class="fas fa-plus"></i> Create Form Link
                </button>
            </div>
        </div>
        
        <div class="stats-grid">
            <div class="stat-card total-forms">
                <div class="stat-icon">
                    <i class="fas fa-link"></i>
                </div>
                <div class="stat-info">
                    <h3 id="totalLinks">0</h3>
                    <p>Form Links</p>
                </div>
            </div>
            
            <div class="stat-card submissions">
                <div class="stat-icon">
                    <i class="fas fa-file-alt"></i>
                </div>
                <div class="stat-info">
                    <h3 id="totalSubmissions">0</h3>
                    <p>Total Submissions</p>
                </div>
            </div>
            
            <div class="stat-card pending">
                <div class="stat-icon">
                    <i class="fas fa-clock"></i>
                </div>
                <div class="stat-info">
                    <h3 id="pendingSubmissions">0</h3>
                    <p>Pending Review</p>
                </div>
            </div>
            
            <div class="stat-card expired">
                <div class="stat-icon">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <div class="stat-info">
                    <h3 id="expiredLinks">0</h3>
                    <p>Expired Links</p>
                </div>
            </div>
        </div>
        
        <div class="action-grid">
            <div class="action-card">
                <h3><i class="fas fa-plus-circle"></i> Create Form Link</h3>
                <p>Generate a new form link for clients to submit information.</p>
                <button class="btn btn-primary" onclick="showGenerateLinkModal()">
                    <i class="fas fa-plus"></i> Create Link
                </button>
            </div>
            
            <div class="action-card">
                <h3><i class="fas fa-eye"></i> View Submissions</h3>
                <p>Review form submissions from your clients.</p>
                <button class="btn btn-primary" onclick="showSection('submissions')">
                    <i class="fas fa-eye"></i> View Submissions
                </button>
            </div>
        </div>
        
        <div class="recent-activity">
            <h3><i class="fas fa-history"></i> Recent Activity</h3>
            <div id="recentActivity" class="activity-list">
                <!-- Activity will be loaded here -->
            </div>
        </div>
    `;
}

// ========== HELPER FUNCTIONS ==========
function showLoading(show) {
    const loadingIndicator = document.getElementById('loadingIndicator');
    if (loadingIndicator) {
        loadingIndicator.style.display = show ? 'block' : 'none';
    }
}

function showAlert(type, message) {
    // Create alert
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'error' ? '#f8d7da' : '#d4edda'};
        color: ${type === 'error' ? '#721c24' : '#155724'};
        padding: 15px 20px;
        border-radius: 8px;
        border: 1px solid ${type === 'error' ? '#f5c6cb' : '#c3e6cb'};
        z-index: 10000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        animation: slideIn 0.3s ease;
    `;
    
    alertDiv.innerHTML = `
        <i class="fas ${type === 'error' ? 'fa-exclamation-circle' : 'fa-check-circle'}"></i>
        <span style="margin-left: 10px;">${message}</span>
        <button onclick="this.parentElement.remove()" 
                style="margin-left: 20px; background: none; border: none; cursor: pointer; color: inherit;">
            ×
        </button>
    `;
    
    document.body.appendChild(alertDiv);
    
    setTimeout(() => {
        if (alertDiv.parentElement) {
            alertDiv.remove();
        }
    }, 3000);
}

function closeModal(modalId = null) {
    if (modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.style.display = 'none';
    } else {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
    }
}

function setupEventListeners() {
    // Close modals on outside click
    window.addEventListener('click', (event) => {
        if (event.target.classList.contains('modal')) {
            closeModal(event.target.id);
        }
    });
    
    // Close modals with Escape key
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            closeModal();
        }
    });
}

// ========== LOGOUT ==========
function logout() {
    if (confirm('Are you sure you want to logout?')) {
        const token = localStorage.getItem('token');
        
        // Call logout API
        if (token) {
            fetch(`${API_BASE_URL}/auth/logout`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            }).catch(console.error);
        }
        
        // Clear local storage
        localStorage.clear();
        
        // Redirect to login
        window.location.href = 'index.html';
    }
}

// ========== GLOBAL FUNCTIONS ==========
window.showGenerateLinkModal = showGenerateLinkModal;
window.generateFormLink = generateFormLink;
window.copyLink = copyLink;
window.closeModal = closeModal;
window.showSection = showSection;
window.logout = logout;