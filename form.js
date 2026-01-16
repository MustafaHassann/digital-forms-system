// ========== PUBLIC FORM SCRIPT - PRODUCTION READY ==========

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
        showError('Invalid form link. Missing access code.');
        disableForm();
        return;
    }
    
    // Setup form submission
    setupFormSubmission(linkCode);
});

// Setup form submission
function setupFormSubmission(linkCode) {
    const form = document.getElementById('customerForm');
    const submitBtn = document.getElementById('submitBtn');
    
    if (!form) return;
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Disable submit button
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
        
        // Get form data
        const formData = new FormData(form);
        const customerData = {};
        
        for (let [key, value] of formData.entries()) {
            customerData[key] = value;
        }
        
        // Validate required fields
        const requiredFields = ['customer_name', 'customer_email', 'phone', 'address', 'city', 'postal_code', 'country', 'source', 'terms'];
        const missingFields = [];
        
        requiredFields.forEach(field => {
            if (!customerData[field]) {
                missingFields.push(field);
            }
        });
        
        if (missingFields.length > 0) {
            showError(`Please fill in all required fields: ${missingFields.map(f => f.replace('_', ' ')).join(', ')}`);
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Form';
            return;
        }
        
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(customerData.customer_email)) {
            showError('Please enter a valid email address');
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Form';
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
            
            // Create a beautiful success display
            const successHTML = `
                <div style="text-align: center; padding: 40px;">
                    <div style="font-size: 72px; color: #27ae60; margin-bottom: 20px;">
                        <i class="fas fa-check-circle"></i>
                    </div>
                    <h2 style="color: #2c3e50; margin-bottom: 15px;">Submission Successful!</h2>
                    <p style="color: #7f8c8d; margin-bottom: 30px; font-size: 18px;">
                        Thank you for completing the form. Your submission has been received.
                    </p>
                    <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; max-width: 400px; margin: 0 auto;">
                        <p style="margin: 0; color: #2c3e50;">
                            <strong>Reference ID:</strong> ${data.data.submission_id}
                        </p>
                    </div>
                </div>
            `;
            
            // Replace form with success message
            document.querySelector('.form-container').innerHTML = successHTML;
            
            // Auto-redirect after 5 seconds
            setTimeout(() => {
                window.location.href = 'thank-you.html';
            }, 5000);
            
        } else {
            showError(data.message || 'Failed to submit form');
            document.getElementById('submitBtn').disabled = false;
            document.getElementById('submitBtn').innerHTML = '<i class="fas fa-paper-plane"></i> Submit Form';
        }
        
    } catch (error) {
        console.error('Submit error:', error);
        showError('Network error. Please check your connection and try again.');
        document.getElementById('submitBtn').disabled = false;
        document.getElementById('submitBtn').innerHTML = '<i class="fas fa-paper-plane"></i> Submit Form';
    } finally {
        showLoading(false);
    }
}

// Disable form
function disableForm() {
    const form = document.getElementById('customerForm');
    const submitBtn = document.getElementById('submitBtn');
    
    if (form) {
        form.querySelectorAll('input, select, textarea, button').forEach(element => {
            element.disabled = true;
        });
    }
    
    if (submitBtn) {
        submitBtn.innerHTML = '<i class="fas fa-exclamation-circle"></i> Form Disabled';
        submitBtn.style.background = '#95a5a6';
    }
}

// UI Helper functions
function showLoading(show) {
    const loadingIndicator = document.getElementById('loadingIndicator');
    if (loadingIndicator) {
        loadingIndicator.style.display = show ? 'flex' : 'none';
    }
}

function showError(message) {
    const errorDiv = document.getElementById('errorAlert');
    if (errorDiv) {
        errorDiv.innerHTML = `
            <i class="fas fa-exclamation-circle"></i>
            <span>${message}</span>
        `;
        errorDiv.style.display = 'flex';
        
        // Scroll to error
        errorDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Auto-hide after 10 seconds
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 10000);
    } else {
        // Fallback alert
        alert(`Error: ${message}`);
    }
}

function showSuccess(message) {
    const successDiv = document.getElementById('successAlert');
    if (successDiv) {
        successDiv.innerHTML = `
            <i class="fas fa-check-circle"></i>
            <span>${message}</span>
        `;
        successDiv.style.display = 'flex';
        
        // Scroll to success
        successDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}