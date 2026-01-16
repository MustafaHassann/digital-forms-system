// ========== DIGITAL FORMS SYSTEM - MAIN SCRIPT ==========

// Configuration
const API_BASE_URL = 'https://digital-forms-api.onrender.com/api';
console.log('🌐 API Base URL:', API_BASE_URL);

// State
let isLoggingIn = false;

// DOM Elements
const loginForm = document.getElementById('loginForm');
const loginBtn = document.getElementById('loginBtn');
const loginAlert = document.getElementById('loginAlert');
const alertMessage = document.getElementById('alertMessage');

// ========== INITIALIZATION ==========
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Digital Forms System loaded');
    console.log('📍 Current URL:', window.location.href);
    
    // Check if user is already logged in
    checkLoginStatus();
    
    // Test backend connection
    testBackendConnection();
    
    // Set focus to username field
    const usernameInput = document.getElementById('username');
    if (usernameInput) {
        usernameInput.focus();
    }
});

// Check login status
function checkLoginStatus() {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (token && user) {
        console.log('✅ User already logged in');
        
        // Validate token before redirecting
        validateToken(token).then(isValid => {
            if (isValid) {
                console.log('✅ Token is valid, redirecting to dashboard...');
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 100);
            } else {
                console.log('❌ Token invalid, clearing storage');
                localStorage.clear();
            }
        });
    }
}

// Validate token with backend
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

// Test backend connection
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
            console.error('❌ Backend error:', response.status);
            showAlert('error', 'Backend server is not responding properly');
            return false;
        }
    } catch (error) {
        console.error('❌ Cannot connect to backend:', error);
        showAlert('warning', `Cannot connect to backend server. Please ensure the backend is running at: ${API_BASE_URL}`);
        return false;
    }
}

// ========== LOGIN HANDLING ==========
if (loginForm) {
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        if (isLoggingIn) {
            console.log('⚠️ Login already in progress');
            return;
        }
        
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        
        // Validate input
        if (!username || !password) {
            showAlert('error', 'Please enter both username and password');
            return;
        }
        
        // Start login process
        isLoggingIn = true;
        
        // Update button state
        const originalBtnText = loginBtn.innerHTML;
        loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Authenticating...';
        loginBtn.disabled = true;
        
        console.log('🔐 Attempting login for user:', username);
        
        try {
            const response = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ 
                    username: username, 
                    password: password 
                })
            });
            
            console.log('📨 Login response status:', response.status);
            
            let data;
            try {
                data = await response.json();
                console.log('📊 Login response:', data);
            } catch (jsonError) {
                console.error('❌ Invalid JSON response:', jsonError);
                showAlert('error', 'Server returned invalid response');
                resetLoginButton(originalBtnText);
                isLoggingIn = false;
                return;
            }
            
            if (response.ok && data.success && data.token) {
                // ✅ LOGIN SUCCESSFUL
                console.log('✅ Login successful!');
                
                // Store the data in localStorage
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                
                // Show success message
                showAlert('success', 'Login successful! Redirecting to dashboard...');
                
                // Wait a moment, then redirect
                setTimeout(() => {
                    console.log('🔄 Redirecting to dashboard...');
                    window.location.href = 'dashboard.html';
                }, 1500);
                
            } else {
                // ❌ LOGIN FAILED
                console.error('❌ Login failed:', data.message || 'Unknown error');
                showAlert('error', data.message || 'Login failed. Please check credentials.');
                resetLoginButton(originalBtnText);
                isLoggingIn = false;
            }
            
        } catch (error) {
            // ❌ NETWORK ERROR
            console.error('❌ Network/Request error:', error);
            showAlert('error', `Cannot connect to server: ${error.message}`);
            resetLoginButton(originalBtnText);
            isLoggingIn = false;
        }
    });
}

// Reset login button
function resetLoginButton(originalText) {
    loginBtn.innerHTML = originalText;
    loginBtn.disabled = false;
}

// ========== ALERT SYSTEM ==========
function showAlert(type, message) {
    // Remove any existing alerts
    const existingAlerts = document.querySelectorAll('.alert-toast');
    existingAlerts.forEach(alert => alert.remove());
    
    // Create alert element
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert-toast alert-${type}`;
    alertDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'error' ? '#f8d7da' : 
                     type === 'success' ? '#d4edda' : 
                     type === 'warning' ? '#fff3cd' : '#d1ecf1'};
        color: ${type === 'error' ? '#721c24' : 
                type === 'success' ? '#155724' : 
                type === 'warning' ? '#856404' : '#0c5460'};
        padding: 15px 20px;
        border-radius: 8px;
        border: 1px solid ${type === 'error' ? '#f5c6cb' : 
                          type === 'success' ? '#c3e6cb' : 
                          type === 'warning' ? '#ffeeba' : '#bee5eb'};
        display: flex;
        align-items: center;
        gap: 10px;
        z-index: 10000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        animation: slideIn 0.3s ease;
        max-width: 400px;
    `;
    
    const icons = {
        'error': 'fa-exclamation-circle',
        'success': 'fa-check-circle',
        'warning': 'fa-exclamation-triangle',
        'info': 'fa-info-circle'
    };
    
    alertDiv.innerHTML = `
        <i class="fas ${icons[type] || 'fa-info-circle'}" style="font-size: 20px;"></i>
        <div style="flex: 1;">${message}</div>
        <button onclick="this.parentElement.remove()" 
                style="background: none; border: none; cursor: pointer; color: inherit; font-size: 18px;">
            ×
        </button>
    `;
    
    document.body.appendChild(alertDiv);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (alertDiv.parentElement) {
            alertDiv.remove();
        }
    }, 5000);
    
    // Also update login alert if exists
    if (loginAlert && alertMessage) {
        alertMessage.textContent = message;
        loginAlert.className = `alert alert-${type}`;
        loginAlert.style.display = 'flex';
        
        setTimeout(() => {
            loginAlert.style.display = 'none';
        }, 5000);
    }
}

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
`;
document.head.appendChild(style);

// ========== EVENT LISTENERS ==========
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

// Forgot password handler
const forgotPasswordLink = document.querySelector('.forgot-password');
if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener('click', function(e) {
        e.preventDefault();
        showAlert('info', 'Please contact your system administrator to reset your password.');
    });
}

// Remember me functionality
const rememberMeCheckbox = document.getElementById('rememberMe');
if (rememberMeCheckbox) {
    // Load saved username
    const savedUsername = localStorage.getItem('rememberedUsername');
    if (savedUsername) {
        document.getElementById('username').value = savedUsername;
        rememberMeCheckbox.checked = true;
    }
    
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

// ========== GLOBAL FUNCTIONS ==========
window.testBackendConnection = testBackendConnection;
window.showAlert = showAlert;

// Quick login for testing
window.quickLogin = function(username = 'admin', password = 'admin123') {
    document.getElementById('username').value = username;
    document.getElementById('password').value = password;
    
    if (loginForm) {
        loginForm.dispatchEvent(new Event('submit'));
    }
};

// Debug function
window.debugSystem = function() {
    console.log('=== SYSTEM DEBUG INFO ===');
    console.log('Token:', localStorage.getItem('token') ? 'Exists' : 'Missing');
    console.log('User:', localStorage.getItem('user'));
    console.log('API Base URL:', API_BASE_URL);
    console.log('Current Page:', window.location.href);
    
    const token = localStorage.getItem('token');
    if (token) {
        console.log('Token (first 20 chars):', token.substring(0, 20) + '...');
    }
};

// Clear all data
window.clearAllData = function() {
    localStorage.clear();
    console.log('🗑️ All data cleared');
    showAlert('success', 'All data cleared. Page will reload.');
    setTimeout(() => {
        window.location.reload();
    }, 1000);
};

// Test API endpoints
window.testAPI = async function() {
    console.log('🔧 Testing API endpoints...');
    
    try {
        // Test health endpoint
        const healthResponse = await fetch(`${API_BASE_URL}/health`);
        const healthData = await healthResponse.json();
        console.log('✅ Health check:', healthData);
        
        // Test login endpoint
        const loginResponse = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'admin', password: 'admin123' })
        });
        
        if (loginResponse.ok) {
            const loginData = await loginResponse.json();
            console.log('✅ Login test successful:', loginData.message);
            
            // Test validate endpoint
            const validateResponse = await fetch(`${API_BASE_URL}/auth/validate`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${loginData.token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            const validateData = await validateResponse.json();
            console.log('✅ Token validation:', validateData);
            
            showAlert('success', 'All API tests passed!');
        } else {
            console.error('❌ Login test failed');
            showAlert('error', 'Login test failed');
        }
        
    } catch (error) {
        console.error('❌ API test error:', error);
        showAlert('error', `API test failed: ${error.message}`);
    }
};