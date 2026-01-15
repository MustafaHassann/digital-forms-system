// API Configuration
// Automatically detect environment
const API_BASE_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000/api'
    : 'https://digital-forms-backend-c0wo.onrender.com/api'; 

// DOM Elements
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const errorMessage = document.getElementById('errorMessage');

// Check if user is already logged in
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (token && user) {
        // Redirect to dashboard
        window.location.href = 'dashboard.html';
    }
    
    // Set focus to username field
    document.getElementById('username').focus();
});

// Login Form Submission
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const rememberMe = document.getElementById('rememberMe').checked;
    
    // Show loading state
    const submitBtn = document.querySelector('.btn-login');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Authenticating...';
    submitBtn.disabled = true;
    
    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Store token and user data
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            
            // Store remember me preference
            if (rememberMe) {
                localStorage.setItem('rememberMe', 'true');
            } else {
                localStorage.removeItem('rememberMe');
            }
            
            // Show success message
            showAlert('success', 'Login successful! Redirecting...');
            
            // Redirect to dashboard after short delay
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1500);
            
        } else {
            // Show error message
            showAlert('error', data.message || 'Login failed');
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    } catch (error) {
        console.error('Login error:', error);
        showAlert('error', 'Network error. Please try again.');
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
});

// Show alert function
function showAlert(type, message) {
    errorMessage.textContent = message;
    
    if (type === 'error') {
        loginError.className = 'alert alert-danger';
        loginError.style.display = 'flex';
    } else {
        loginError.className = 'alert alert-success';
        loginError.style.display = 'flex';
        errorMessage.textContent = message;
    }
    
    // Auto hide after 5 seconds
    setTimeout(() => {
        loginError.style.display = 'none';
    }, 5000);
}

// Forgot password link
document.querySelector('.forgot-link')?.addEventListener('click', (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value.trim();
    
    if (username) {
        alert(`Password reset instructions will be sent to the email associated with ${username}`);
    } else {
        alert('Please enter your username first');
    }
});

// Enter key navigation
document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        const activeElement = document.activeElement;
        if (activeElement.id === 'password') {
            loginForm.dispatchEvent(new Event('submit'));
        }
    }
});