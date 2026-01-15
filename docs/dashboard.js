// ========== DIGITAL FORMS SYSTEM - DASHBOARD SCRIPT ==========

// Configuration
function getApiBaseUrl() {
    const hostname = window.location.hostname;
    
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'http://localhost:3000/api';
    }
    
    // Production - USE YOUR RENDER URL
    return 'https://digital-forms-api.onrender.com/api';
}

const API_BASE_URL = getApiBaseUrl();
console.log('🌐 Dashboard API URL:', API_BASE_URL);

// State
let currentUser = null;
let userStats = {
    total_links: 0,
    total_submissions: 0,
    pending_submissions: 0,
    expired_links: 0
};

let formLinks = [];
let submissions = [];

// ========== INITIALIZATION ==========
document.addEventListener('DOMContentLoaded', async function() {
    console.log('📊 Dashboard initializing...');
    
    // Check authentication
    if (!checkAuthentication()) {
        return;
    }
    
    // Load user data
    await loadUserData();
    
    // Initialize dashboard
    await initializeDashboard();
    
    // Set up event listeners
    setupEventListeners();
    
    console.log('✅ Dashboard initialized');
});

// ========== AUTHENTICATION ==========
function checkAuthentication() {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (!token || !userData) {
        console.log('❌ No authentication data found');
        alert('Please login to access the dashboard');
        window.location.href = 'index.html';
        return false;
    }
    
    try {
        currentUser = JSON.parse(userData);
        console.log('👤 Current user:', currentUser);
        return true;
    } catch (error) {
        console.error('Error parsing user data:', error);
        logout();
        return false;
    }
}

async function loadUserData() {
    try {
        // Update user info in UI
        updateUserInfo();
        
        // Show admin menu if admin
        if (currentUser.role === 'admin') {
            const adminMenu = document.getElementById('adminMenu');
            if (adminMenu) {
                adminMenu.style.display = 'block';
            }
        }
        
    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

function updateUserInfo() {
    if (!currentUser) return;
    
    // Update user name
    const userNameElement = document.getElementById('userName');
    const userRoleElement = document.getElementById('userRole');
    const userAvatar = document.getElementById('currentUser');
    
    if (userNameElement) {
        userNameElement.textContent = currentUser.full_name || currentUser.username;
    }
    
    if (userRoleElement) {
        userRoleElement.textContent = currentUser.role.toUpperCase();
    }
    
    if (userAvatar) {
        // Create initials for avatar
        const name = currentUser.full_name || currentUser.username;
        const initials = name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .substring(0, 2);
        userAvatar.textContent = initials;
        
        // Add color based on role
        userAvatar.style.background = currentUser.role === 'admin' ? '#e74c3c' : '#3498db';
    }
}

// ========== DASHBOARD INITIALIZATION ==========
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
        updateStatsDisplay();
        updateRecentActivity();
        
        // Hide loading
        showLoading(false);
        
    } catch (error) {
        console.error('Error initializing dashboard:', error);
        showLoading(false);
        showAlert('error', 'Failed to load dashboard data. Please refresh.');
    }
}

function showLoading(show) {
    const loadingDiv = document.getElementById('loadingIndicator');
    if (loadingDiv) {
        loadingDiv.style.display = show ? 'block' : 'none';
    }
    
    // Disable/enable main content
    const mainContent = document.getElementById('contentArea');
    if (mainContent) {
        mainContent.style.opacity = show ? '0.5' : '1';
        mainContent.style.pointerEvents = show ? 'none' : 'auto';
    }
}

// ========== DATA LOADING ==========
async function loadDashboardStats() {
    try {
        const token = localStorage.getItem('token');
        
        const response = await fetch(`${API_BASE_URL}/submissions/stats`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            userStats = data.stats || userStats;
            console.log('📈 Dashboard stats loaded:', userStats);
        } else {
            console.warn('Could not load stats, using defaults');
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
            formLinks = data.links || [];
            console.log('🔗 Form links loaded:', formLinks.length);
        } else {
            console.warn('Could not load form links');
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
            submissions = data.submissions || [];
            console.log('📄 Submissions loaded:', submissions.length);
        } else {
            console.warn('Could not load submissions');
        }
        
    } catch (error) {
        console.error('Error loading submissions:', error);
    }
}

// ========== UI UPDATES ==========
function updateStatsDisplay() {
    // Update stats cards
    document.getElementById('totalLinks').textContent = userStats.total_links || 0;
    document.getElementById('totalSubmissions').textContent = userStats.total_submissions || 0;
    document.getElementById('pendingSubmissions').textContent = userStats.pending_submissions || 0;
    
    // Calculate expired links
    const expiredCount = formLinks.filter(link => {
        if (!link.expires_at) return false;
        const expiryDate = new Date(link.expires_at);
        return expiryDate < new Date();
    }).length;
    
    document.getElementById('expiredLinks').textContent = expiredCount;
}

function updateRecentActivity() {
    const activityDiv = document.getElementById('recentActivity');
    if (!activityDiv) return;
    
    // Combine recent activities from links and submissions
    const activities = [];
    
    // Add recent form links (last 5)
    const recentLinks = formLinks.slice(0, 5);
    recentLinks.forEach(link => {
        const timeAgo = getTimeAgo(new Date(link.created_at));
        activities.push({
            type: 'link',
            message: `Created form link for ${link.unit_number}`,
            time: timeAgo,
            icon: 'fa-link'
        });
    });
    
    // Add recent submissions (last 5)
    const recentSubmissions = submissions.slice(0, 5);
    recentSubmissions.forEach(sub => {
        const timeAgo = getTimeAgo(new Date(sub.submitted_at));
        activities.push({
            type: 'submission',
            message: `New submission from ${sub.customer_name}`,
            time: timeAgo,
            icon: 'fa-file-alt'
        });
    });
    
    // Sort by time (newest first)
    activities.sort((a, b) => new Date(b.time) - new Date(a.time));
    
    // Display activities
    if (activities.length === 0) {
        activityDiv.innerHTML = `
            <div style="text-align: center; padding: 20px; color: #7f8c8d;">
                <i class="fas fa-inbox" style="font-size: 48px; opacity: 0.3;"></i>
                <p style="margin-top: 10px;">No recent activity yet</p>
            </div>
        `;
        return;
    }
    
    let html = '<div style="max-height: 300px; overflow-y: auto;">';
    activities.forEach(activity => {
        html += `
            <div style="padding: 12px; border-bottom: 1px solid #eee; display: flex; align-items: center; gap: 12px;">
                <div style="width: 32px; height: 32px; border-radius: 50%; background: #f8f9fa; 
                          display: flex; align-items: center; justify-content: center; color: #3498db;">
                    <i class="fas ${activity.icon}"></i>
                </div>
                <div style="flex: 1;">
                    <div style="font-weight: 500;">${activity.message}</div>
                    <div style="font-size: 12px; color: #95a5a6;">${activity.time}</div>
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
        
        // Set default sales agent to current user
        const salesAgentInput = document.getElementById('salesAgent');
        if (salesAgentInput && currentUser) {
            salesAgentInput.value = currentUser.full_name || currentUser.username;
        }
        
        // Focus on unit number input
        setTimeout(() => {
            const unitInput = document.getElementById('unitNumber');
            if (unitInput) unitInput.focus();
        }, 100);
    }
}

async function generateFormLink() {
    const unitNumber = document.getElementById('unitNumber').value.trim();
    const salesAgent = document.getElementById('salesAgent').value.trim();
    const clientEmail = document.getElementById('clientEmail').value.trim();
    const expiryDays = document.getElementById('expiryDays').value;
    
    // Validation
    if (!unitNumber || !salesAgent) {
        showAlert('error', 'Please fill in Unit Number and Sales Agent');
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        
        showLoading(true);
        
        const response = await fetch(`${API_BASE_URL}/forms/create-link`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                unit_number: unitNumber,
                sales_agent: salesAgent,
                client_email: clientEmail || null,
                expiry_days: parseInt(expiryDays) || 14
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Success
            showAlert('success', 'Form link created successfully!');
            
            // Show generated link
            showGeneratedLink(data.link);
            
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
        console.error('Error generating link:', error);
        showAlert('error', 'Network error. Please check your connection.');
    } finally {
        showLoading(false);
    }
}

function showGeneratedLink(linkData) {
    const modal = document.getElementById('linkGeneratedModal');
    if (!modal) return;
    
    // Generate full URL
    const baseUrl = window.location.origin;
    const formUrl = `${baseUrl}/form.html?code=${linkData.link_code}`;
    
    // Update modal content
    const linkInput = document.getElementById('generatedLink');
    const linkDetails = document.getElementById('linkDetails');
    
    if (linkInput) {
        linkInput.value = formUrl;
    }
    
    if (linkDetails) {
        linkDetails.innerHTML = `
            <strong>Unit Number:</strong> ${linkData.unit_number}<br>
            <strong>Sales Agent:</strong> ${linkData.sales_agent}<br>
            <strong>Link Code:</strong> ${linkData.link_code}<br>
            <strong>Expires:</strong> ${new Date(linkData.expires_at).toLocaleDateString()}
        `;
    }
    
    // Show success modal
    document.getElementById('generateLinkModal').style.display = 'none';
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

// ========== MODAL MANAGEMENT ==========
function closeModal() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.style.display = 'none';
    });
}

// ========== NAVIGATION ==========
function showDashboard() {
    // Already on dashboard, just reload data
    initializeDashboard();
    updateActiveMenu('dashboard');
}

function showMyLinks() {
    updateActiveMenu('links');
    
    // Create links table if it doesn't exist
    const contentArea = document.getElementById('contentArea');
    if (!contentArea) return;
    
    contentArea.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px;">
            <h1 class="page-title">My Form Links</h1>
            <button class="btn btn-primary" onclick="showGenerateLinkModal()">
                <i class="fas fa-plus"></i> Create New Link
            </button>
        </div>
        
        ${formLinks.length === 0 ? `
            <div style="text-align: center; padding: 60px 20px; background: white; border-radius: 10px; box-shadow: 0 4px 15px rgba(0,0,0,0.08);">
                <i class="fas fa-link" style="font-size: 60px; color: #ddd; margin-bottom: 20px;"></i>
                <h3 style="margin-bottom: 10px; color: #2c3e50;">No Form Links Yet</h3>
                <p style="color: #7f8c8d; margin-bottom: 30px; max-width: 400px; margin: 0 auto 30px;">
                    Create your first form link to start collecting form submissions from clients.
                </p>
                <button class="btn btn-primary" onclick="showGenerateLinkModal()">
                    <i class="fas fa-plus"></i> Create Your First Link
                </button>
            </div>
        ` : `
            <div style="background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.08);">
                <table class="data-table" style="width: 100%;">
                    <thead>
                        <tr>
                            <th>Unit Number</th>
                            <th>Sales Agent</th>
                            <th>Created</th>
                            <th>Expires</th>
                            <th>Status</th>
                            <th>Submissions</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${formLinks.map(link => {
                            const isExpired = new Date(link.expires_at) < new Date();
                            const status = isExpired ? 'Expired' : (link.status || 'Active');
                            const statusClass = isExpired ? 'badge-danger' : 'badge-success';
                            
                            return `
                                <tr>
                                    <td>${link.unit_number}</td>
                                    <td>${link.sales_agent}</td>
                                    <td>${new Date(link.created_at).toLocaleDateString()}</td>
                                    <td>${new Date(link.expires_at).toLocaleDateString()}</td>
                                    <td><span class="badge ${statusClass}">${status}</span></td>
                                    <td>${link.submissions_count || 0}</td>
                                    <td>
                                        <button class="action-btn" onclick="copyLinkToClipboard('${link.link_code}')" title="Copy Link">
                                            <i class="fas fa-copy"></i>
                                        </button>
                                        <button class="action-btn" onclick="viewLinkDetails('${link.id}')" title="View Details">
                                            <i class="fas fa-eye"></i>
                                        </button>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `}
    `;
}

function showSubmissions() {
    updateActiveMenu('submissions');
    
    const contentArea = document.getElementById('contentArea');
    if (!contentArea) return;
    
    contentArea.innerHTML = `
        <h1 class="page-title">Form Submissions</h1>
        
        ${submissions.length === 0 ? `
            <div style="text-align: center; padding: 60px 20px; background: white; border-radius: 10px; box-shadow: 0 4px 15px rgba(0,0,0,0.08);">
                <i class="fas fa-inbox" style="font-size: 60px; color: #ddd; margin-bottom: 20px;"></i>
                <h3 style="margin-bottom: 10px; color: #2c3e50;">No Submissions Yet</h3>
                <p style="color: #7f8c8d; margin-bottom: 30px; max-width: 400px; margin: 0 auto 30px;">
                    When clients submit forms using your links, they will appear here.
                </p>
                <button class="btn btn-primary" onclick="showGenerateLinkModal()">
                    <i class="fas fa-link"></i> Create Form Link
                </button>
            </div>
        ` : `
            <div class="submissions-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px;">
                ${submissions.map(sub => {
                    const status = sub.status || 'pending';
                    const statusColors = {
                        'pending': { bg: '#fff3cd', color: '#856404', icon: 'fa-clock' },
                        'approved': { bg: '#d4edda', color: '#155724', icon: 'fa-check' },
                        'rejected': { bg: '#f8d7da', color: '#721c24', icon: 'fa-times' }
                    };
                    const statusConfig = statusColors[status] || statusColors.pending;
                    
                    return `
                        <div style="background: white; border-radius: 10px; padding: 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.08);">
                            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 15px;">
                                <div>
                                    <h4 style="margin: 0; color: #2c3e50;">${sub.customer_name}</h4>
                                    <div style="font-size: 12px; color: #7f8c8d;">${sub.customer_email || 'No email'}</div>
                                </div>
                                <div style="padding: 4px 12px; border-radius: 20px; background: ${statusConfig.bg}; color: ${statusConfig.color}; 
                                      font-size: 12px; font-weight: 600; display: flex; align-items: center; gap: 5px;">
                                    <i class="fas ${statusConfig.icon}"></i>
                                    ${status.charAt(0).toUpperCase() + status.slice(1)}
                                </div>
                            </div>
                            
                            <div style="margin-bottom: 15px;">
                                <div style="font-size: 12px; color: #7f8c8d; margin-bottom: 5px;">Unit Number</div>
                                <div style="font-weight: 500;">${sub.unit_number}</div>
                            </div>
                            
                            <div style="margin-bottom: 15px;">
                                <div style="font-size: 12px; color: #7f8c8d; margin-bottom: 5px;">Submitted</div>
                                <div>${new Date(sub.submitted_at).toLocaleString()}</div>
                            </div>
                            
                            <div style="display: flex; gap: 10px; margin-top: 20px;">
                                <button class="btn" onclick="viewSubmission('${sub.id}')" 
                                        style="flex: 1; background: #f8f9fa; color: #2c3e50;">
                                    <i class="fas fa-eye"></i> View
                                </button>
                                <button class="btn" onclick="downloadSubmission('${sub.id}')" 
                                        style="flex: 1; background: #3498db; color: white;">
                                    <i class="fas fa-download"></i> Download
                                </button>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `}
    `;
}

function showAdmin() {
    updateActiveMenu('admin');
    
    const contentArea = document.getElementById('contentArea');
    if (!contentArea) return;
    
    contentArea.innerHTML = `
        <h1 class="page-title">Admin Panel</h1>
        
        <div style="background: white; border-radius: 10px; padding: 30px; box-shadow: 0 4px 15px rgba(0,0,0,0.08);">
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px;">
                <div style="text-align: center; padding: 20px; background: #f8f9fa; border-radius: 8px;">
                    <div style="font-size: 32px; font-weight: bold; color: #2c3e50;">${formLinks.length}</div>
                    <div style="color: #7f8c8d;">Total Form Links</div>
                </div>
                <div style="text-align: center; padding: 20px; background: #f8f9fa; border-radius: 8px;">
                    <div style="font-size: 32px; font-weight: bold; color: #2c3e50;">${submissions.length}</div>
                    <div style="color: #7f8c8d;">Total Submissions</div>
                </div>
                <div style="text-align: center; padding: 20px; background: #f8f9fa; border-radius: 8px;">
                    <div style="font-size: 32px; font-weight: bold; color: #2c3e50;">1</div>
                    <div style="color: #7f8c8d;">Active Users</div>
                </div>
            </div>
            
            <h3 style="margin-bottom: 20px; color: #2c3e50;">System Management</h3>
            
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px;">
                <button class="btn" onclick="manageUsers()" 
                        style="background: #f8f9fa; color: #2c3e50; text-align: left; padding: 15px;">
                    <i class="fas fa-users" style="margin-right: 10px;"></i>
                    <div>
                        <div style="font-weight: 600;">User Management</div>
                        <div style="font-size: 12px; color: #7f8c8d;">Add, edit, or remove users</div>
                    </div>
                </button>
                
                <button class="btn" onclick="viewSystemLogs()" 
                        style="background: #f8f9fa; color: #2c3e50; text-align: left; padding: 15px;">
                    <i class="fas fa-clipboard-list" style="margin-right: 10px;"></i>
                    <div>
                        <div style="font-weight: 600;">System Logs</div>
                        <div style="font-size: 12px; color: #7f8c8d;">View system activity</div>
                    </div>
                </button>
                
                <button class="btn" onclick="exportData()" 
                        style="background: #f8f9fa; color: #2c3e50; text-align: left; padding: 15px;">
                    <i class="fas fa-download" style="margin-right: 10px;"></i>
                    <div>
                        <div style="font-weight: 600;">Export Data</div>
                        <div style="font-size: 12px; color: #7f8c8d;">Download all data as CSV</div>
                    </div>
                </button>
            </div>
        </div>
    `;
}

function updateActiveMenu(activePage) {
    // Remove active class from all
    document.querySelectorAll('.sidebar-menu a').forEach(link => {
        link.classList.remove('active');
    });
    
    // Add active class to current
    const menuItems = {
        'dashboard': 0,
        'links': 2,
        'submissions': 3,
        'admin': 4
    };
    
    if (menuItems[activePage] !== undefined) {
        const menuItem = document.querySelectorAll('.sidebar-menu li')[menuItems[activePage]];
        if (menuItem) {
            menuItem.querySelector('a').classList.add('active');
        }
    }
}

// ========== HELPER FUNCTIONS ==========
function copyLinkToClipboard(linkCode) {
    const baseUrl = window.location.origin;
    const fullUrl = `${baseUrl}/form.html?code=${linkCode}`;
    
    navigator.clipboard.writeText(fullUrl)
        .then(() => {
            showAlert('success', 'Link copied to clipboard!');
        })
        .catch(err => {
            console.error('Failed to copy:', err);
            showAlert('error', 'Failed to copy link');
        });
}

function viewLinkDetails(linkId) {
    const link = formLinks.find(l => l.id === linkId);
    if (!link) return;
    
    alert(`Link Details:\n
Unit: ${link.unit_number}\n
Agent: ${link.sales_agent}\n
Created: ${new Date(link.created_at).toLocaleString()}\n
Expires: ${new Date(link.expires_at).toLocaleString()}\n
Status: ${link.status}\n
Submissions: ${link.submissions_count || 0}`);
}

function viewSubmission(submissionId) {
    const submission = submissions.find(s => s.id === submissionId);
    if (!submission) return;
    
    alert(`Submission Details:\n
Customer: ${submission.customer_name}\n
Email: ${submission.customer_email || 'N/A'}\n
Unit: ${submission.unit_number}\n
Submitted: ${new Date(submission.submitted_at).toLocaleString()}\n
Status: ${submission.status}\n
Data: ${JSON.stringify(submission.submission_data, null, 2)}`);
}

function downloadSubmission(submissionId) {
    const submission = submissions.find(s => s.id === submissionId);
    if (!submission) return;
    
    // Create a blob with the submission data
    const dataStr = JSON.stringify(submission, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    // Create download link
    const downloadLink = document.createElement('a');
    downloadLink.href = URL.createObjectURL(dataBlob);
    downloadLink.download = `submission-${submissionId}.json`;
    
    // Trigger download
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    
    showAlert('success', 'Submission downloaded as JSON');
}

// ========== ADMIN FUNCTIONS ==========
function manageUsers() {
    alert('User management feature would open here.\n\nIn a full implementation, you would be able to:\n• Add new users\n• Edit user roles\n• Reset passwords\n• View user activity');
}

function viewSystemLogs() {
    alert('System logs feature would open here.\n\nThis would show all system activities including:\n• User logins/logouts\n• Form link creations\n• Form submissions\n• System errors');
}

function exportData() {
    // Combine all data
    const exportData = {
        exported_at: new Date().toISOString(),
        user: currentUser,
        form_links: formLinks,
        submissions: submissions,
        stats: userStats
    };
    
    // Create JSON file
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    // Create download link
    const downloadLink = document.createElement('a');
    downloadLink.href = URL.createObjectURL(dataBlob);
    downloadLink.download = `digital-forms-export-${new Date().toISOString().split('T')[0]}.json`;
    
    // Trigger download
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    
    showAlert('success', 'All data exported as JSON');
}

// ========== ALERT SYSTEM ==========
function showAlert(type, message) {
    // Create alert container if it doesn't exist
    let alertContainer = document.getElementById('dashboardAlertContainer');
    if (!alertContainer) {
        alertContainer = document.createElement('div');
        alertContainer.id = 'dashboardAlertContainer';
        alertContainer.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            max-width: 400px;
        `;
        document.body.appendChild(alertContainer);
    }
    
    // Create alert element
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.style.cssText = `
        background: ${type === 'error' ? '#f8d7da' : 
                     type === 'success' ? '#d4edda' : 
                     type === 'warning' ? '#fff3cd' : '#d1ecf1'};
        color: ${type === 'error' ? '#721c24' : 
                type === 'success' ? '#155724' : 
                type === 'warning' ? '#856404' : '#0c5460'};
        padding: 15px 20px;
        border-radius: 8px;
        margin-bottom: 10px;
        border: 1px solid ${type === 'error' ? '#f5c6cb' : 
                          type === 'success' ? '#c3e6cb' : 
                          type === 'warning' ? '#ffeeba' : '#bee5eb'};
        display: flex;
        align-items: center;
        gap: 10px;
        animation: slideIn 0.3s ease;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    `;
    
    // Icon based on type
    const icons = {
        'error': 'fa-exclamation-circle',
        'success': 'fa-check-circle',
        'warning': 'fa-exclamation-triangle',
        'info': 'fa-info-circle'
    };
    
    alert.innerHTML = `
        <i class="fas ${icons[type] || 'fa-info-circle'}" style="font-size: 20px;"></i>
        <div style="flex: 1;">${message}</div>
        <button onclick="this.parentElement.remove()" 
                style="background: none; border: none; cursor: pointer; color: inherit;">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    // Add to container
    alertContainer.appendChild(alert);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (alert.parentElement) {
            alert.remove();
        }
    }, 5000);
}

// ========== EVENT LISTENERS ==========
function setupEventListeners() {
    // Close modals when clicking outside
    window.addEventListener('click', function(event) {
        if (event.target.classList.contains('modal')) {
            closeModal();
        }
    });
    
    // Close modal with Escape key
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            closeModal();
        }
    });
    
    // Refresh data every 5 minutes
    setInterval(() => {
        if (document.visibilityState === 'visible') {
            loadDashboardStats().then(() => {
                updateStatsDisplay();
            });
        }
    }, 5 * 60 * 1000);
}

// ========== LOGOUT ==========
function logout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = 'index.html';
    }
}

// ========== GLOBAL FUNCTIONS ==========
// Make functions available globally
window.showGenerateLinkModal = showGenerateLinkModal;
window.closeModal = closeModal;
window.generateFormLink = generateFormLink;
window.copyLink = copyLink;
window.showDashboard = showDashboard;
window.showMyLinks = showMyLinks;
window.showSubmissions = showSubmissions;
window.showAdmin = showAdmin;
window.logout = logout;
window.copyLinkToClipboard = copyLinkToClipboard;
window.viewLinkDetails = viewLinkDetails;
window.viewSubmission = viewSubmission;
window.downloadSubmission = downloadSubmission;
window.manageUsers = manageUsers;
window.viewSystemLogs = viewSystemLogs;
window.exportData = exportData;

// Debug functions
window.refreshDashboard = function() {
    console.log('🔄 Refreshing dashboard...');
    initializeDashboard();
};

window.showDebugInfo = function() {
    console.log('=== DEBUG INFO ===');
    console.log('Current User:', currentUser);
    console.log('Stats:', userStats);
    console.log('Form Links:', formLinks.length);
    console.log('Submissions:', submissions.length);
    console.log('API Base URL:', API_BASE_URL);
    
    alert(`Debug Info:
User: ${currentUser?.username || 'None'}
Role: ${currentUser?.role || 'None'}
Form Links: ${formLinks.length}
Submissions: ${submissions.length}
API: ${API_BASE_URL}`);
};

// Add CSS for animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            opacity: 0;
            transform: translateX(100%);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }
    
    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }
    
    .data-table {
        width: 100%;
        border-collapse: collapse;
        background: white;
    }
    
    .data-table th,
    .data-table td {
        padding: 12px 15px;
        text-align: left;
        border-bottom: 1px solid #eee;
    }
    
    .data-table th {
        background: #f8f9fa;
        font-weight: 600;
        color: #2c3e50;
    }
    
    .data-table tr:hover {
        background: #f8fafc;
    }
    
    .badge {
        display: inline-block;
        padding: 4px 12px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 600;
    }
    
    .badge-success {
        background: rgba(39, 174, 96, 0.1);
        color: #27ae60;
    }
    
    .badge-danger {
        background: rgba(231, 76, 60, 0.1);
        color: #e74c3c;
    }
    
    .action-btn {
        background: #f8f9fa;
        border: none;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        margin: 0 2px;
        color: #7f8c8d;
        transition: all 0.2s;
    }
    
    .action-btn:hover {
        background: #3498db;
        color: white;
        transform: translateY(-2px);
    }
    
    .btn {
        padding: 10px 20px;
        border-radius: 6px;
        border: none;
        font-weight: 600;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        transition: all 0.3s;
    }
    
    .btn-primary {
        background: #3498db;
        color: white;
    }
    
    .btn-primary:hover {
        background: #2980b9;
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(52, 152, 219, 0.3);
    }
    
    .modal {
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        z-index: 2000;
        align-items: center;
        justify-content: center;
        animation: fadeIn 0.3s ease;
    }
`;
document.head.appendChild(style);