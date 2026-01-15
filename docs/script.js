// ========== DIGITAL FORMS SYSTEM - FRONTEND SCRIPT ==========
// Configuration
function getApiBaseUrl() {
    // Determine API URL based on environment
    const hostname = window.location.hostname;
    
    // Local development
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'http://localhost:3000/api';
    }
    
    // Production - USE YOUR RENDER URL HERE
    return 'https://digital-forms-api.onrender.com/api';
}

const API_BASE_URL = getApiBaseUrl();
console.log('🌐 Using API URL:', API_BASE_URL);

// DOM Elements
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const errorMessage = document.getElementById('errorMessage');

// ========== INITIALIZATION ==========
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Digital Forms System loaded');
    
    // Check if already logged in
    checkLoginStatus();
    
    // Set focus to username field
    const usernameInput = document.getElementById('username');
    if (usernameInput) {
        usernameInput.focus();
    }
    
    // Test backend connection on load
    testBackendConnection();
});

// Check if user is already logged in
function checkLoginStatus() {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (token && user) {
        console.log('✅ User already logged in, redirecting to dashboard...');
        // User is logged in, redirect to dashboard
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 500);
    }
}

// ========== BACKEND CONNECTION TEST ==========
async function testBackendConnection() {
    console.log('🔍 Testing backend connection...');
    
    try {
        const response = await fetch(`${API_BASE_URL}/health`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Backend connected:', data);
            return true;
        } else {
            console.error('❌ Backend returned error:', response.status);
            showAlert('error', 'Backend server error. Please try again later.');
            return false;
        }
    } catch (error) {
        console.error('❌ Cannot connect to backend:', error.message);
        showAlert('error', `Cannot connect to server. Please check:<br>
                    1. Backend is running at: ${API_BASE_URL}<br>
                    2. No network connectivity issues`);
        return false;
    }
}

// ========== LOGIN HANDLING ==========
if (loginForm) {
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        
        // Validate input
        if (!username || !password) {
            showAlert('error', 'Please enter both username and password');
            return;
        }
        
        // Show loading state
        const submitBtn = document.querySelector('.btn-login');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Authenticating...';
        submitBtn.disabled = true;
        
        console.log('🔐 Attempting login for user:', username);
        
        try {
            const response = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });
            
            console.log('📨 Login response status:', response.status);
            
            let data;
            try {
                data = await response.json();
                console.log('📊 Login response data:', data);
            } catch (jsonError) {
                console.error('❌ Invalid JSON response:', jsonError);
                showAlert('error', 'Server returned invalid response. Please try again.');
                resetLoginButton(submitBtn, originalText);
                return;
            }
            
            if (response.ok && data.token) {
                // ✅ LOGIN SUCCESSFUL
                console.log('✅ Login successful!');
                
                // Save authentication data
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                
                // Show success message
                showAlert('success', 'Login successful! Redirecting to dashboard...');
                
                // Redirect to dashboard after short delay
                setTimeout(() => {
                    console.log('🔄 Redirecting to dashboard...');
                    window.location.href = 'dashboard.html';
                }, 1500);
                
            } else {
                // ❌ LOGIN FAILED
                console.error('❌ Login failed:', data.message);
                showAlert('error', data.message || `Login failed (Status: ${response.status})`);
                resetLoginButton(submitBtn, originalText);
            }
            
        } catch (error) {
            // ❌ NETWORK ERROR
            console.error('❌ Network/Request error:', error);
            
            let errorMsg = 'Cannot connect to server. ';
            
            if (error.message.includes('Failed to fetch')) {
                errorMsg += `
                    <br><br>Please check:
                    <br>1. Backend is running at: ${API_BASE_URL}
                    <br>2. No CORS errors (check browser console)
                    <br>3. Internet connection is working
                `;
            } else {
                errorMsg += error.message;
            }
            
            showAlert('error', errorMsg);
            resetLoginButton(submitBtn, originalText);
        }
    });
}

// Reset login button to original state
function resetLoginButton(button, originalText) {
    if (button) {
        button.innerHTML = originalText;
        button.disabled = false;
    }
}

// ========== ALERT/TOAST SYSTEM ==========
function showAlert(type, message) {
    // Create alert container if it doesn't exist
    let alertContainer = document.getElementById('alertContainer');
    if (!alertContainer) {
        alertContainer = document.createElement('div');
        alertContainer.id = 'alertContainer';
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
        background: ${type === 'error' ? '#f8d7da' : '#d4edda'};
        color: ${type === 'error' ? '#721c24' : '#155724'};
        padding: 15px 20px;
        border-radius: 8px;
        margin-bottom: 10px;
        border: 1px solid ${type === 'error' ? '#f5c6cb' : '#c3e6cb'};
        display: flex;
        align-items: center;
        gap: 10px;
        animation: slideIn 0.3s ease;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    `;
    
    // Icon based on type
    const icon = type === 'error' ? 'fa-exclamation-circle' : 'fa-check-circle';
    alert.innerHTML = `
        <i class="fas ${icon}" style="font-size: 20px;"></i>
        <div>
            <strong>${type === 'error' ? 'Error' : 'Success'}:</strong>
            <div style="margin-top: 5px;">${message}</div>
        </div>
        <button onclick="this.parentElement.remove()" 
                style="margin-left: auto; background: none; border: none; cursor: pointer; color: inherit;">
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
    
    // Also update login error display if exists
    if (errorMessage) {
        errorMessage.innerHTML = message;
        loginError.className = `alert alert-${type}`;
        loginError.style.display = 'flex';
        
        setTimeout(() => {
            if (loginError) {
                loginError.style.display = 'none';
            }
        }, 5000);
    }
}

// ========== ADD TEST CONNECTION BUTTON ==========
// Add test button to page
function addTestButton() {
    // Check if button already exists
    if (document.getElementById('testConnectionBtn')) return;
    
    const testBtn = document.createElement('button');
    testBtn.id = 'testConnectionBtn';
    testBtn.innerHTML = '🔧 Test Backend Connection';
    testBtn.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 10px 20px;
        background: #3498db;
        color: white;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        font-size: 14px;
        z-index: 1000;
        box-shadow: 0 4px 12px rgba(52, 152, 219, 0.3);
        transition: all 0.3s;
    `;
    
    testBtn.onmouseover = function() {
        this.style.transform = 'translateY(-2px)';
        this.style.boxShadow = '0 6px 15px rgba(52, 152, 219, 0.4)';
    };
    
    testBtn.onmouseout = function() {
        this.style.transform = 'translateY(0)';
        this.style.boxShadow = '0 4px 12px rgba(52, 152, 219, 0.3)';
    };
    
    testBtn.onclick = async function() {
        this.disabled = true;
        this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Testing...';
        
        const isConnected = await testBackendConnection();
        
        this.disabled = false;
        this.innerHTML = '🔧 Test Backend Connection';
        
        if (isConnected) {
            // Add success indicator
            this.style.background = '#27ae60';
            setTimeout(() => {
                this.style.background = '#3498db';
            }, 2000);
        }
    };
    
    document.body.appendChild(testBtn);
}

// ========== ADD CSS ANIMATIONS ==========
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
    
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
    
    .fa-spinner {
        animation: spin 1s linear infinite;
    }
    
    .alert {
        animation: slideIn 0.3s ease;
    }
`;
document.head.appendChild(style);

// ========== FORGOT PASSWORD HANDLING ==========
const forgotLink = document.querySelector('.forgot-link');
if (forgotLink) {
    forgotLink.addEventListener('click', function(e) {
        e.preventDefault();
        const username = document.getElementById('username').value.trim();
        
        if (username) {
            alert(`Password reset instructions will be sent to the email associated with "${username}".\n\nFor now, use the default credentials:\nUsername: admin\nPassword: admin123`);
        } else {
            alert('Please enter your username first, then click Forgot Password.');
        }
    });
}

// ========== REMEMBER ME FUNCTIONALITY ==========
const rememberMeCheckbox = document.getElementById('rememberMe');
if (rememberMeCheckbox) {
    // Load saved username if exists
    const savedUsername = localStorage.getItem('rememberedUsername');
    if (savedUsername) {
        document.getElementById('username').value = savedUsername;
        rememberMeCheckbox.checked = true;
    }
    
    // Save on change
    rememberMeCheckbox.addEventListener('change', function() {
        if (this.checked) {
            const username = document.getElementById('username').value.trim();
            if (username) {
                localStorage.setItem('rememberedUsername', username);
            }
        } else {
            localStorage.removeItem('rememberedUsername');
        }
    });
}

// ========== ENTER KEY NAVIGATION ==========
document.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        const activeElement = document.activeElement;
        
        if (activeElement.id === 'password' && loginForm) {
            // Trigger form submission
            loginForm.dispatchEvent(new Event('submit'));
        }
        
        if (activeElement.id === 'username') {
            // Move to password field
            document.getElementById('password').focus();
            e.preventDefault();
        }
    }
});

// ========== DEMO CREDENTIALS INFO ==========
// Add demo credentials info if not already present
function addDemoInfo() {
    if (document.getElementById('demoInfo')) return;
    
    const demoInfo = document.createElement('div');
    demoInfo.id = 'demoInfo';
    demoInfo.style.cssText = `
        margin-top: 30px;
        padding: 15px;
        background: #f8f9fa;
        border-radius: 8px;
        border-left: 4px solid #3498db;
        font-size: 14px;
        color: #7f8c8d;
    `;
    
    demoInfo.innerHTML = `
        <strong>📋 Demo Credentials:</strong><br>
        <div style="margin-top: 10px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <div style="background: white; padding: 10px; border-radius: 5px;">
                <strong>Admin Account:</strong><br>
                Username: <code>admin</code><br>
                Password: <code>admin123</code>
            </div>
            <div style="background: white; padding: 10px; border-radius: 5px;">
                <strong>Agent Account:</strong><br>
                Username: <code>agent1</code><br>
                Password: <code>password123</code>
            </div>
        </div>
        <div style="margin-top: 10px; font-size: 12px;">
            <i class="fas fa-info-circle"></i> These are demo credentials. Change them in production.
        </div>
    `;
    
    const formContainer = document.querySelector('.login-form-container') || 
                         document.querySelector('.login-right') || 
                         document.querySelector('form').parentElement;
    
    if (formContainer) {
        formContainer.appendChild(demoInfo);
    }
}

// ========== INITIALIZE ON LOAD ==========
window.addEventListener('load', function() {
    // Add test button
    addTestButton();
    
    // Add demo info
    addDemoInfo();
    
    // Test connection automatically
    setTimeout(() => {
        testBackendConnection();
    }, 1000);
    
    // Log environment info
    console.log('=== DIGITAL FORMS SYSTEM ===');
    console.log('Frontend URL:', window.location.href);
    console.log('Backend API:', API_BASE_URL);
    console.log('Environment:', window.location.hostname === 'localhost' ? 'Development' : 'Production');
    console.log('===========================');
});

// ========== GLOBAL FUNCTIONS ==========
// Make functions available globally for testing
window.testBackendConnection = testBackendConnection;
window.showAlert = showAlert;

// Quick login test function
window.quickLogin = function(username = 'admin', password = 'admin123') {
    document.getElementById('username').value = username;
    document.getElementById('password').value = password;
    
    if (loginForm) {
        loginForm.dispatchEvent(new Event('submit'));
    }
};

// Clear login data
window.clearLogin = function() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('rememberedUsername');
    alert('Login data cleared. Please refresh the page.');
};

// Debug info
window.showDebugInfo = function() {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    console.log('=== DEBUG INFO ===');
    console.log('Token exists:', !!token);
    console.log('User data:', user ? JSON.parse(user) : 'No user data');
    console.log('API Base URL:', API_BASE_URL);
    console.log('Current page:', window.location.href);
    
    alert(`Debug Info:\n
Token: ${token ? 'Exists' : 'Missing'}\n
User: ${user ? 'Logged in' : 'Not logged in'}\n
API: ${API_BASE_URL}\n
Page: ${window.location.href}`);
};

// ========== NETWORK STATUS MONITOR ==========
// Monitor network status
let isOnline = navigator.onLine;

window.addEventListener('online', function() {
    isOnline = true;
    console.log('🌐 Network connection restored');
    showAlert('success', 'Network connection restored');
});

window.addEventListener('offline', function() {
    isOnline = false;
    console.log('⚠️ Network connection lost');
    showAlert('error', 'Network connection lost. Please check your internet connection.');
});

// Periodic connection check
setInterval(() => {
    if (!isOnline) {
        showAlert('warning', 'You appear to be offline. Some features may not work.');
    }
}, 30000);

// ========== SESSION MANAGEMENT ==========
// Auto-logout after 24 hours (for security)
setTimeout(() => {
    const token = localStorage.getItem('token');
    if (token && window.location.pathname.includes('dashboard')) {
        console.log('⚠️ Session expired due to inactivity');
        showAlert('warning', 'Your session has expired. Please login again.');
        localStorage.clear();
        window.location.href = 'index.html';
    }
}, 24 * 60 * 60 * 1000); // 24 hours