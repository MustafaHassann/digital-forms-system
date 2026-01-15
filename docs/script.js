// ========== DIGITAL FORMS SYSTEM - FRONTEND SCRIPT ==========
// Configuration
function getApiBaseUrl() {
    // Determine API URL based on environment
    const hostname = window.location.hostname;
    const port = window.location.port;
    
    console.log('Hostname:', hostname, 'Port:', port);
    
    // Local development
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'http://localhost:3000/api';
    }
    
    // GitHub Pages (your frontend) - Backend on Render
    // REPLACE WITH YOUR ACTUAL RENDER BACKEND URL
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
    console.log('🔍 Testing backend connection to:', API_BASE_URL);
    
    try {
        const response = await fetch(`${API_BASE_URL}/health`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            },
            mode: 'cors'
        });
        
        console.log('Response status:', response.status);
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Backend connected:', data);
            return true;
        } else {
            console.error('❌ Backend returned error:', response.status);
            console.error('Response text:', await response.text());
            return false;
        }
    } catch (error) {
        console.error('❌ Cannot connect to backend:', error.message);
        console.error('Full error:', error);
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
                body: JSON.stringify({ 
                    username: username, 
                    password: password 
                }),
                mode: 'cors'
            });
            
            console.log('📨 Login response status:', response.status);
            
            let data;
            try {
                data = await response.json();
                console.log('📊 Login response data:', data);
            } catch (jsonError) {
                console.error('❌ Invalid JSON response:', jsonError);
                const text = await response.text();
                console.error('Raw response:', text);
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
                }, 1000);
                
            } else {
                // ❌ LOGIN FAILED
                console.error('❌ Login failed:', data.message || 'Unknown error');
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
                    <br><br>If backend is on Render, ensure:
                    <br>- The service is running
                    <br>- CORS is properly configured
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
    // Remove any existing alerts first
    const existingAlerts = document.querySelectorAll('.custom-alert');
    existingAlerts.forEach(alert => alert.remove());
    
    // Create alert element
    const alert = document.createElement('div');
    alert.className = `custom-alert alert-${type}`;
    alert.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
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
        max-width: 400px;
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
                style="background: none; border: none; cursor: pointer; color: inherit; font-size: 18px;">
            ×
        </button>
    `;
    
    // Add to document
    document.body.appendChild(alert);
    
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
`;
document.head.appendChild(style);

// ========== FORGOT PASSWORD HANDLING ==========
const forgotLink = document.querySelector('.forgot-link');
if (forgotLink) {
    forgotLink.addEventListener('click', function(e) {
        e.preventDefault();
        const username = document.getElementById('username').value.trim();
        
        if (username) {
            showAlert('info', `Password reset feature coming soon. For now, use demo credentials.`);
        } else {
            showAlert('info', 'Please enter your username first.');
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

// ========== INITIALIZE ON LOAD ==========
window.addEventListener('load', function() {
    // Log environment info
    console.log('=== DIGITAL FORMS SYSTEM ===');
    console.log('Frontend URL:', window.location.href);
    console.log('Backend API:', API_BASE_URL);
    console.log('Environment:', window.location.hostname === 'localhost' ? 'Development' : 'Production');
    console.log('===========================');
    
    // Test connection automatically
    setTimeout(async () => {
        const isConnected = await testBackendConnection();
        if (!isConnected) {
            showAlert('warning', `Cannot connect to backend server at ${API_BASE_URL}. Some features may not work.`);
        }
    }, 1000);
});