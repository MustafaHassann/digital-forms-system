// Add these functions to your dashboard.js

// ========== CHANGE PASSWORD FUNCTIONALITY ==========
function showChangePasswordModal() {
    const modalHTML = `
        <div class="modal" id="changePasswordModal" style="display: flex;">
            <div class="modal-content">
                <div class="modal-header">
                    <h3><i class="fas fa-key"></i> Change Password</h3>
                    <button class="btn btn-outline" onclick="closeModal('changePasswordModal')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <form id="changePasswordForm">
                        <div class="form-group">
                            <label for="currentPassword">Current Password *</label>
                            <input type="password" id="currentPassword" class="form-control" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="newPassword">New Password *</label>
                            <input type="password" id="newPassword" class="form-control" required
                                   minlength="8" 
                                   pattern="^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$"
                                   title="Password must be at least 8 characters with uppercase, lowercase, and number">
                            <small class="text-muted">Minimum 8 characters with uppercase, lowercase, and number</small>
                        </div>
                        
                        <div class="form-group">
                            <label for="confirmPassword">Confirm New Password *</label>
                            <input type="password" id="confirmPassword" class="form-control" required>
                        </div>
                        
                        <div class="password-strength" style="margin-bottom: 20px;">
                            <div style="font-size: 14px; color: #7f8c8d; margin-bottom: 5px;">Password Strength:</div>
                            <div style="height: 5px; background: #eee; border-radius: 3px; overflow: hidden;">
                                <div id="passwordStrengthBar" style="height: 100%; width: 0%; background: #e74c3c; transition: all 0.3s;"></div>
                            </div>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-outline" onclick="closeModal('changePasswordModal')">Cancel</button>
                    <button class="btn btn-primary" onclick="changePassword()">
                        <i class="fas fa-save"></i> Update Password
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Add password strength checker
    document.getElementById('newPassword').addEventListener('input', function(e) {
        checkPasswordStrength(e.target.value);
    });
}

function checkPasswordStrength(password) {
    const strengthBar = document.getElementById('passwordStrengthBar');
    let strength = 0;
    
    // Length check
    if (password.length >= 8) strength += 25;
    if (password.length >= 12) strength += 15;
    
    // Complexity checks
    if (/[a-z]/.test(password)) strength += 20;
    if (/[A-Z]/.test(password)) strength += 20;
    if (/[0-9]/.test(password)) strength += 20;
    if (/[^A-Za-z0-9]/.test(password)) strength += 20;
    
    // Update bar
    strengthBar.style.width = `${Math.min(strength, 100)}%`;
    
    // Update color
    if (strength < 40) {
        strengthBar.style.background = '#e74c3c';
    } else if (strength < 70) {
        strengthBar.style.background = '#f39c12';
    } else {
        strengthBar.style.background = '#27ae60';
    }
}

async function changePassword() {
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
        showAlert('error', 'Please fill in all fields');
        return;
    }
    
    if (newPassword.length < 8) {
        showAlert('error', 'Password must be at least 8 characters');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        showAlert('error', 'New passwords do not match');
        return;
    }
    
    if (newPassword === currentPassword) {
        showAlert('error', 'New password must be different from current password');
        return;
    }
    
    // Check password complexity
    const hasLower = /[a-z]/.test(newPassword);
    const hasUpper = /[A-Z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);
    
    if (!hasLower || !hasUpper || !hasNumber) {
        showAlert('error', 'Password must contain uppercase, lowercase, and numbers');
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        
        const response = await fetch(`${API_BASE_URL}/auth/change-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                currentPassword,
                newPassword
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showAlert('success', 'Password changed successfully');
            closeModal('changePasswordModal');
            
            // Clear form
            document.getElementById('currentPassword').value = '';
            document.getElementById('newPassword').value = '';
            document.getElementById('confirmPassword').value = '';
        } else {
            showAlert('error', data.message || 'Failed to change password');
        }
        
    } catch (error) {
        console.error('Change password error:', error);
        showAlert('error', 'Network error. Please try again.');
    }
}

// ========== USER MANAGEMENT FUNCTIONS ==========
function showUserManagement() {
    const contentArea = document.getElementById('contentArea');
    
    contentArea.innerHTML = `
        <div class="page-title">
            <h1><i class="fas fa-users"></i> User Management</h1>
            <div class="header-actions">
                <button class="btn btn-primary" onclick="showCreateUserModal()">
                    <i class="fas fa-user-plus"></i> Add New User
                </button>
            </div>
        </div>
        
        <div class="table-container">
            <div class="table-header">
                <h3><i class="fas fa-list"></i> System Users</h3>
                <div style="display: flex; gap: 10px;">
                    <input type="text" id="userSearch" class="form-control" style="width: 200px;" 
                           placeholder="Search users...">
                    <select id="roleFilter" class="form-control" style="width: 150px;">
                        <option value="">All Roles</option>
                        <option value="admin">Admin</option>
                        <option value="agent">Agent</option>
                    </select>
                </div>
            </div>
            <div id="usersTableContent">
                <div class="loading-indicator" style="position: relative; transform: none; box-shadow: none;">
                    <i class="fas fa-spinner fa-spin"></i>
                    <div>Loading users...</div>
                </div>
            </div>
        </div>
    `;
    
    loadUsers();
}

async function loadUsers() {
    try {
        const token = localStorage.getItem('token');
        
        const response = await fetch(`${API_BASE_URL}/admin/users`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            displayUsers(data.data);
        } else {
            showAlert('error', 'Failed to load users');
        }
        
    } catch (error) {
        console.error('Load users error:', error);
        showAlert('error', 'Failed to load users');
    }
}

function displayUsers(users) {
    const usersTableContent = document.getElementById('usersTableContent');
    
    if (!users || users.length === 0) {
        usersTableContent.innerHTML = `
            <div class="empty-state" style="padding: 40px;">
                <i class="fas fa-users" style="font-size: 48px;"></i>
                <h4>No Users Found</h4>
                <p>No users in the system yet.</p>
                <button class="btn btn-primary" onclick="showCreateUserModal()" style="margin-top: 20px;">
                    <i class="fas fa-user-plus"></i> Add First User
                </button>
            </div>
        `;
        return;
    }
    
    let html = `
        <table>
            <thead>
                <tr>
                    <th>Username</th>
                    <th>Full Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Department</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    users.forEach(user => {
        const statusClass = user.is_active ? 'badge-success' : 'badge-danger';
        const statusText = user.is_active ? 'Active' : 'Inactive';
        const roleClass = user.role === 'admin' ? 'badge-info' : 'badge-primary';
        
        html += `
            <tr>
                <td><strong>${user.username}</strong></td>
                <td>${user.full_name}</td>
                <td>${user.email}</td>
                <td><span class="badge ${roleClass}">${user.role.toUpperCase()}</span></td>
                <td>${user.department || 'N/A'}</td>
                <td><span class="badge ${statusClass}">${statusText}</span></td>
                <td>${new Date(user.created_at).toLocaleDateString()}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-outline" style="padding: 5px 10px; font-size: 12px;" 
                                onclick="editUser(${user.id})">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="btn btn-outline" style="padding: 5px 10px; font-size: 12px;" 
                                onclick="resetUserPassword(${user.id})">
                            <i class="fas fa-key"></i> Reset
                        </button>
                        ${user.id !== currentUser.id ? `
                            <button class="btn btn-danger" style="padding: 5px 10px; font-size: 12px;" 
                                    onclick="deleteUser(${user.id})">
                                <i class="fas fa-trash"></i> Delete
                            </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `;
    });
    
    html += `
            </tbody>
        </table>
    `;
    
    usersTableContent.innerHTML = html;
}

function showCreateUserModal() {
    const modalHTML = `
        <div class="modal" id="createUserModal" style="display: flex;">
            <div class="modal-content" style="max-width: 600px;">
                <div class="modal-header">
                    <h3><i class="fas fa-user-plus"></i> Create New User</h3>
                    <button class="btn btn-outline" onclick="closeModal('createUserModal')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <form id="createUserForm">
                        <div class="form-row">
                            <div class="form-group">
                                <label for="newUsername">Username *</label>
                                <input type="text" id="newUsername" class="form-control" required>
                            </div>
                            <div class="form-group">
                                <label for="newPassword">Password *</label>
                                <input type="password" id="newUserPassword" class="form-control" required>
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label for="newFullName">Full Name *</label>
                                <input type="text" id="newFullName" class="form-control" required>
                            </div>
                            <div class="form-group">
                                <label for="newEmail">Email *</label>
                                <input type="email" id="newEmail" class="form-control" required>
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label for="newRole">Role *</label>
                                <select id="newRole" class="form-control" required>
                                    <option value="">Select Role</option>
                                    <option value="admin">Administrator</option>
                                    <option value="agent">Agent</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="newDepartment">Department</label>
                                <input type="text" id="newDepartment" class="form-control">
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label>
                                <input type="checkbox" id="newUserActive" checked>
                                <span>Account Active</span>
                            </label>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-outline" onclick="closeModal('createUserModal')">Cancel</button>
                    <button class="btn btn-primary" onclick="createUser()">
                        <i class="fas fa-save"></i> Create User
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

async function createUser() {
    const username = document.getElementById('newUsername').value.trim();
    const password = document.getElementById('newUserPassword').value;
    const fullName = document.getElementById('newFullName').value.trim();
    const email = document.getElementById('newEmail').value.trim();
    const role = document.getElementById('newRole').value;
    const department = document.getElementById('newDepartment').value.trim();
    const isActive = document.getElementById('newUserActive').checked;
    
    // Validation
    if (!username || !password || !fullName || !email || !role) {
        showAlert('error', 'Please fill in all required fields');
        return;
    }
    
    if (password.length < 8) {
        showAlert('error', 'Password must be at least 8 characters');
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        
        const response = await fetch(`${API_BASE_URL}/admin/users`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                username,
                password,
                email,
                full_name: fullName,
                role,
                department: department || null,
                is_active: isActive
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showAlert('success', 'User created successfully');
            closeModal('createUserModal');
            loadUsers(); // Refresh user list
        } else {
            showAlert('error', data.message || 'Failed to create user');
        }
        
    } catch (error) {
        console.error('Create user error:', error);
        showAlert('error', 'Failed to create user');
    }
}

function editUser(userId) {
    showAlert('info', `Edit user ${userId} - Implement edit functionality`);
    // Implement edit user functionality
}

function resetUserPassword(userId) {
    const newPassword = prompt('Enter new password for this user:');
    if (newPassword && newPassword.length >= 8) {
        // Call API to reset password
        showAlert('info', `Password reset for user ${userId} - Implement API call`);
    } else if (newPassword) {
        showAlert('error', 'Password must be at least 8 characters');
    }
}

async function deleteUser(userId) {
    if (!confirm('Are you sure you want to delete this user?')) {
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        
        const response = await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            showAlert('success', 'User deleted successfully');
            loadUsers(); // Refresh user list
        } else {
            showAlert('error', data.message || 'Failed to delete user');
        }
        
    } catch (error) {
        console.error('Delete user error:', error);
        showAlert('error', 'Failed to delete user');
    }
}

// Update the settings section in getSettingsHTML() to include change password
function getSettingsHTML() {
    return `
        <div class="page-title">
            <h1><i class="fas fa-cog"></i> Settings</h1>
        </div>
        
        <div style="max-width: 600px; margin: 0 auto;">
            <div class="form-section">
                <h3><i class="fas fa-user"></i> Profile Settings</h3>
                
                <div class="form-group">
                    <label>Full Name</label>
                    <input type="text" class="form-control" value="${currentUser?.full_name || currentUser?.username}" readonly>
                </div>
                
                <div class="form-group">
                    <label>Email Address</label>
                    <input type="email" class="form-control" value="${currentUser?.email || 'Not set'}" readonly>
                </div>
                
                <div class="form-group">
                    <label>Role</label>
                    <input type="text" class="form-control" value="${currentUser?.role?.toUpperCase() || 'USER'}" readonly>
                </div>
                
                <button class="btn btn-primary" onclick="showChangePasswordModal()" style="margin-top: 20px;">
                    <i class="fas fa-key"></i> Change Password
                </button>
            </div>
            
            ${currentUser?.role === 'admin' ? `
                <div class="form-section">
                    <h3><i class="fas fa-users"></i> User Management</h3>
                    <p style="color: #7f8c8d; margin-bottom: 20px;">
                        Manage system users, roles, and permissions.
                    </p>
                    <button class="btn btn-primary" onclick="showUserManagement()">
                        <i class="fas fa-user-cog"></i> Manage Users
                    </button>
                </div>
            ` : ''}
            
            <div class="form-section">
                <h3><i class="fas fa-bell"></i> Notifications</h3>
                
                <div style="margin-bottom: 15px;">
                    <label style="display: flex; align-items: center; gap: 10px;">
                        <input type="checkbox" checked>
                        <span>Email notifications for new submissions</span>
                    </label>
                </div>
                
                <div style="margin-bottom: 15px;">
                    <label style="display: flex; align-items: center; gap: 10px;">
                        <input type="checkbox" checked>
                        <span>Link expiration reminders</span>
                    </label>
                </div>
                
                <button class="btn btn-primary" style="width: 100%;">
                    <i class="fas fa-save"></i> Save Preferences
                </button>
            </div>
        </div>
    `;
}

// Add these functions to global window object
window.showChangePasswordModal = showChangePasswordModal;
window.showUserManagement = showUserManagement;
window.createUser = createUser;
window.editUser = editUser;
window.resetUserPassword = resetUserPassword;
window.deleteUser = deleteUser;