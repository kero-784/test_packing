// Add this helper function to render company info
function renderCompanyInfoPreview() {
    const container = document.getElementById('company-preview-container');
    if(!container) return;
    
    const settings = state.companySettings || {};
    
    container.innerHTML = `
        <div class="card">
            <h2>Company Details Preview</h2>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 14px;">
                <div><strong>Name:</strong> ${settings.CompanyName || '-'}</div>
                <div><strong>Phone:</strong> ${settings.Phone || '-'}</div>
                <div><strong>Email:</strong> ${settings.Email || '-'}</div>
                <div><strong>Tax ID:</strong> ${settings.TaxID || '-'}</div>
                <div style="grid-column: 1 / -1;"><strong>Address:</strong> ${settings.Address || '-'}</div>
            </div>
        </div>
    `;
}

// Update the User Management Renderer
function renderUserManagementUI() {
    const usersTable = document.getElementById('table-users');
    const rolesTable = document.getElementById('table-roles');
    
    // Render the new Company Info module
    renderCompanyInfoPreview();

    if(!usersTable || !rolesTable) return;
    
    // Ensure responsive wrapper
    if (!usersTable.parentElement.classList.contains('table-responsive')) {
        const wrapper = document.createElement('div');
        wrapper.className = 'table-responsive';
        usersTable.parentNode.insertBefore(wrapper, usersTable);
        wrapper.appendChild(usersTable);
    }
    if (!rolesTable.parentElement.classList.contains('table-responsive')) {
        const wrapper = document.createElement('div');
        wrapper.className = 'table-responsive';
        rolesTable.parentNode.insertBefore(wrapper, rolesTable);
        wrapper.appendChild(rolesTable);
    }
    
    const usersTbody = usersTable.querySelector('tbody');
    let userHtml = '';
    (state.allUsers || []).forEach(user => {
        const assigned = findByKey(state.branches, 'branchCode', user.AssignedBranchCode)?.branchName || findByKey(state.sections, 'sectionCode', user.AssignedSectionCode)?.sectionName || 'N/A';
        const isDisabled = user.isDisabled === true || String(user.isDisabled).toUpperCase() === 'TRUE';
        userHtml += `<tr><td>${user.Username}</td><td>${user.Name}</td><td>${user.RoleName}</td><td>${assigned}</td><td><span class="status-tag ${isDisabled ? 'status-rejected' : 'status-approved'}">${isDisabled ? 'Disabled' : 'Active'}</span></td><td><button class="secondary small btn-edit" data-type="user" data-id="${user.Username}">${_t('edit')}</button></td></tr>`;
    });
    usersTbody.innerHTML = userHtml;

    const rolesTbody = rolesTable.querySelector('tbody');
    let roleHtml = '';
    (state.allRoles || []).forEach(role => {
        roleHtml += `<tr><td>${role.RoleName}</td><td><button class="secondary small btn-edit" data-type="role" data-id="${role.RoleName}">${_t('edit')}</button></td></tr>`;
    });
    rolesTbody.innerHTML = roleHtml;
}
