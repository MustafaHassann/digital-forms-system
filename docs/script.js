// ========== CONFIGURATION ==========
// USE YOUR ACTUAL RENDER URL HERE
const RENDER_BACKEND = 'https://digital-forms-api.onrender.com';
const API_BASE_URL = `${RENDER_BACKEND}/api`;

console.log('🌐 API Base URL:', API_BASE_URL);

// ========== TEST CONNECTION ==========
async function testConnection() {
    console.log('🔍 Testing backend connection...');
    
    try {
        const response = await fetch(`${API_BASE_URL}/health`);
        const data = await response.json();
        
        if (response.ok) {
            console.log('✅ Backend connected:', data);
            alert('✅ Backend connected successfully!');
            return true;
        } else {
            console.error('❌ Backend error:', data);
            alert('❌ Backend error: ' + (data.message || 'Unknown error'));
            return false;
        }
    } catch (error) {
        console.error('❌ Cannot connect to backend:', error);
        alert(`❌ Cannot connect to backend.\n\nURL: ${API_BASE_URL}/health\n\nError: ${error.message}`);
        return false;
    }
}

// ========== LOGIN FUNCTION ==========
async function handleLogin(username, password) {
    console.log('🔐 Attempting login:', username);
    
    // Show loading
    const submitBtn = document.querySelector('.btn-login');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
    }
    
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
        
        const data = await response.json();
        console.log('📊 Login response:', data);
        
        if (response.ok && data.token) {
            // Success
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            
            alert('✅ Login successful! Redirecting...');
            
            // Redirect to dashboard
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1000);
            
        } else {
            // Error
            alert(`❌ Login failed: ${data.message || 'Unknown error'}`);
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login to System';
            }
        }
        
    } catch (error) {
        console.error('❌ Network error:', error);
        alert(`❌ Network error: ${error.message}\n\nMake sure backend is running at: ${API_BASE_URL}`);
        
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login to System';
        }
    }
}

// ========== INITIALIZE ==========
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Digital Forms System loaded');
    
    // Add test button
    const container = document.querySelector('.login-form-container') || document.body;
    const testBtn = document.createElement('button');
    testBtn.innerHTML = '🔧 Test Backend Connection';
    testBtn.style.cssText = `
        display: block;
        margin: 20px auto;
        padding: 10px 20px;
        background: #3498db;
        color: white;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        font-size: 14px;
    `;
    testBtn.onclick = testConnection;
    container.appendChild(testBtn);
    
    // Setup login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const username = document.getElementById('username').value.trim();
            const password = document.getElementById('password').value;
            
            if (!username || !password) {
                alert('Please enter both username and password');
                return;
            }
            
            handleLogin(username, password);
        });
    }
    
    // Auto-test connection
    setTimeout(testConnection, 1000);
});

// ========== GLOBAL FUNCTIONS ==========
window.testBackend = testConnection;