// ========== PUBLIC FORM SCRIPT ==========

const API_BASE_URL = 'https://digital-forms-api.onrender.com/api';

// Get link code from URL
function getLinkCode() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('code');
}

// Initialize form
document.addEventListener('DOMContentLoaded', async function() {
    console.log('📝 Form page loaded');
    
    const linkCode = getLinkCode();
    
    if (!linkCode) {
        showError('Form link is invalid or missing code parameter');
        return;
    }
    
    // Validate link
    await validateLink(linkCode);
    
    // Setup form submission
    setupFormSubmission(linkCode);
});

// Validate link
async function validateLink(linkCode) {
    try {
        showLoading(true);
        
        // Note: We're using a different endpoint structure than before
        // For now, we'll assume the link is valid if we can reach the submit endpoint
        
        showLoading(false);
        return true;
        
    } catch (error) {
        console.error('Link validation error:', error);
        showError('This form link is invalid or has expired.');
        return false;
    }
}

// Setup form submission
function setupFormSubmission(linkCode) {
    const form = document.getElementById('customerForm');
    
    if (!form) return;
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Get form data
        const formData = new FormData(form);
        const customerData = {};
        
        for (let [key, value] of formData.entries()) {
            customerData[key] = value;
        }
        
        // Validate required fields
        if (!customerData.customer_name || !customerData.customer_email) {
            showError('Please fill in all required fields');
            return;
        }
        
        // Prepare submission data
        const submissionData = {
            customer_name: customerData.customer_name,
            customer_email: customerData.customer_email,
            form_data: customerData
        };
        
        // Submit form
        await submitForm(linkCode, submissionData);
    });
}

// Submit form to backend
async function submitForm(linkCode, submissionData) {
    try {
        showLoading(true);
        
        const response = await fetch(`${API_BASE_URL}/submissions/submit/${linkCode}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(submissionData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Show success message
            showSuccess('Form submitted successfully! Thank you for your submission.');
            
            // Reset form
            document.getElementById('customerForm').reset();
            
            // Optionally redirect after delay
            setTimeout(() => {
                window.location.href = 'thank-you.html';
            }, 3000);
            
        } else {
            showError(data.message || 'Failed to submit form');
        }
        
    } catch (error) {
        console.error('Submit error:', error);
        showError('Network error. Please try again.');
    } finally {
        showLoading(false);
    }
}

// UI Helper functions
function showLoading(show) {
    const loadingDiv = document.getElementById('loadingIndicator');
    if (loadingDiv) {
        loadingDiv.style.display = show ? 'flex' : 'none';
    }
}

function showError(message) {
    const errorDiv = document.getElementById('errorAlert');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 5000);
    }
}

function showSuccess(message) {
    const successDiv = document.getElementById('successAlert');
    if (successDiv) {
        successDiv.textContent = message;
        successDiv.style.display = 'block';
        
        setTimeout(() => {
            successDiv.style.display = 'none';
        }, 5000);
    }
}