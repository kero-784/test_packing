import { state } from './state.js';
import { _t } from './i18n.js';
import { findByKey, userCan, getVisibleBranchesForCurrentUser } from './utils.js';
import { calculateStockLevels, calculateSupplierFinancials } from './calculations.js';
import { openEditModal, openHistoryModal } from './ui.js';

export function updateReceiveGrandTotal() { 
    let gt = 0; state.currentReceiveList.forEach(i => gt += (parseFloat(i.quantity) || 0) * (parseFloat(i.cost) || 0)); 
    const el = document.getElementById('receive-grand-total'); if (el) el.textContent = `${gt.toFixed(2)} EGP`; 
}
export function updateTransferGrandTotal() { 
    let gt = 0; state.currentTransferList.forEach(i => gt += (parseFloat(i.quantity) || 0)); 
    const el = document.getElementById('transfer-grand-total'); if (el) el.textContent = gt.toFixed(2); 
}
export function updateIssueGrandTotal() { 
    let gt = 0; state.currentIssueList.forEach(i => gt += (parseFloat(i.quantity) || 0)); 
    const el = document.getElementById('issue-grand-total'); if (el) el.textContent = gt.toFixed(2); 
}

export function renderItemsTable(data = state.items) {
    const tbody = document.querySelector('#table-items tbody');
    if (!tbody) return;
    tbody.innerHTML = data.map(item => `
        <tr>
            <td>${item.code}</td><td>${item.name}</td><td>${item.category}</td><td>${item.unit}</td>
            <td>${(parseFloat(item.cost) || 0).toFixed(2)}</td>
            <td><button class="secondary small btn-edit" data-type="item" data-id="${item.code}">Edit</button></td>
        </tr>
    `).join('') || '<tr><td colspan="6">No items.</td></tr>';
}

export function renderSuppliersTable(data = state.suppliers) {
    const tbody = document.querySelector('#table-suppliers tbody');
    if (!tbody) return;
    const financials = calculateSupplierFinancials();
    tbody.innerHTML = data.map(s => `
        <tr>
            <td>${s.supplierCode}</td><td>${s.name}</td><td>${s.contact}</td>
            <td>${(financials[s.supplierCode]?.balance || 0).toFixed(2)}</td>
            <td><button class="secondary small btn-edit" data-type="supplier" data-id="${s.supplierCode}">Edit</button></td>
        </tr>
    `).join('');
}

export function renderBranchesTable(data = state.branches) {
    const tbody = document.querySelector('#table-branches tbody');
    if (!tbody) return;
    tbody.innerHTML = data.map(b => `
        <tr><td>${b.branchCode}</td><td>${b.branchName}</td><td><button class="secondary small btn-edit" data-type="branch" data-id="${b.branchCode}">Edit</button></td></tr>
    `).join('');
}

export function renderSectionsTable(data = state.sections) {
    const tbody = document.querySelector('#table-sections tbody');
    if (!tbody) return;
    tbody.innerHTML = data.map(s => `
        <tr><td>${s.sectionCode}</td><td>${s.sectionName}</td><td><button class="secondary small btn-edit" data-type="section" data-id="${s.sectionCode}">Edit</button></td></tr>
    `).join('');
}

export function renderReceiveListTable() {
    const tbody = document.querySelector('#table-receive-list tbody');
    if (!tbody) return;
    tbody.innerHTML = state.currentReceiveList.map((item, idx) => `
        <tr>
            <td>${item.itemCode}</td><td>${item.itemName}</td>
            <td><input type="number" class="table-input" data-index="${idx}" data-field="quantity" value="${item.quantity}"></td>
            <td><input type="number" class="table-input" data-index="${idx}" data-field="cost" value="${item.cost}"></td>
            <td>${((item.quantity || 0) * (item.cost || 0)).toFixed(2)}</td>
            <td><button class="danger small btn-remove-row" data-index="${idx}">X</button></td>
        </tr>
    `).join('');
    updateReceiveGrandTotal();
}

export function renderIssueListTable() {
    const tbody = document.querySelector('#table-issue-list tbody');
    if (!tbody) return;
    tbody.innerHTML = state.currentIssueList.map((item, idx) => `
        <tr>
            <td>${item.itemCode}</td><td>${item.itemName}</td>
            <td><input type="number" class="table-input" data-index="${idx}" data-field="quantity" value="${item.quantity}"></td>
            <td><button class="danger small btn-remove-row" data-index="${idx}">X</button></td>
        </tr>
    `).join('');
    updateIssueGrandTotal();
}

export function renderTransferListTable() {
    const tbody = document.querySelector('#table-transfer-list tbody');
    if (!tbody) return;
    tbody.innerHTML = state.currentTransferList.map((item, idx) => `
        <tr>
            <td>${item.itemCode}</td><td>${item.itemName}</td>
            <td><input type="number" class="table-input" data-index="${idx}" data-field="quantity" value="${item.quantity}"></td>
            <td><button class="danger small btn-remove-row" data-index="${idx}">X</button></td>
        </tr>
    `).join('');
    updateTransferGrandTotal();
}

export function renderAdjustmentListTable() {
    const tbody = document.querySelector('#table-adjustment-list tbody');
    if (!tbody) return;
    tbody.innerHTML = state.currentAdjustmentList.map((item, idx) => `
        <tr>
            <td>${item.itemCode}</td><td>${item.itemName}</td>
            <td><input type="number" class="table-input" data-index="${idx}" data-field="physicalCount" value="${item.physicalCount || 0}"></td>
            <td><button class="danger small btn-remove-row" data-index="${idx}">X</button></td>
        </tr>
    `).join('');
}

export function renderItemCentricStockView() {
    const container = document.getElementById('item-centric-stock-container');
    if (!container) return;
    const stock = calculateStockLevels();
    const branches = getVisibleBranchesForCurrentUser();
    let html = '<table><thead><tr><th>Code</th><th>Name</th>' + branches.map(b => `<th>${b.branchName}</th>`).join('') + '<th>Total</th></tr></thead><tbody>';
    state.items.forEach(item => {
        html += `<tr><td>${item.code}</td><td>${item.name}</td>`;
        let total = 0;
        branches.forEach(b => {
            const q = stock[b.branchCode]?.[item.code]?.quantity || 0;
            total += q; html += `<td>${q.toFixed(2)}</td>`;
        });
        html += `<td><strong>${total.toFixed(2)}</strong></td></tr>`;
    });
    container.innerHTML = html + '</tbody></table>';
}

export function renderItemInquiry(term) {
    const container = document.getElementById('item-inquiry-results');
    if (!container) return;
    if (!term) { container.innerHTML = ''; return; }
    const stock = calculateStockLevels();
    const filtered = state.items.filter(i => i.name.toLowerCase().includes(term) || i.code.toLowerCase().includes(term));
    container.innerHTML = filtered.slice(0, 3).map(item => {
        let rows = '';
        state.branches.forEach(b => {
            const q = stock[b.branchCode]?.[item.code]?.quantity || 0;
            if(q > 0) rows += `<tr><td>${b.branchName}</td><td>${q.toFixed(2)}</td></tr>`;
        });
        return `<h4>${item.name}</h4><table>${rows || '<tr><td>No stock</td></tr>'}</table>`;
    }).join('');
}

export function renderTransactionHistory() {
    const tbody = document.querySelector('#table-transaction-history tbody');
    if (!tbody) return;
    tbody.innerHTML = [...state.transactions].reverse().slice(0, 20).map(tx => `
        <tr><td>${new Date(tx.date).toLocaleDateString()}</td><td>${tx.type}</td><td>${tx.ref || tx.batchId}</td><td>${tx.itemCode}</td><td>${tx.quantity}</td><td>View</td></tr>
    `).join('');
}

export function updatePendingRequestsWidget() {
    const count = (state.itemRequests || []).filter(r => r.Status === 'Pending').length;
    const widget = document.getElementById('pending-requests-widget');
    if (widget) {
        widget.style.display = count > 0 ? 'flex' : 'none';
        document.getElementById('pending-requests-count').textContent = count;
    }
}

export function renderUserManagementUI() {
    const tbody = document.querySelector('#table-users tbody');
    if (!tbody) return;
    tbody.innerHTML = state.allUsers.map(u => `<tr><td>${u.Username}</td><td>${u.Name}</td><td>${u.RoleName}</td><td><button class="secondary small btn-edit" data-type="user" data-id="${u.Username}">Edit</button></td></tr>`).join('');
}

export function renderActivityLog() {
    const tbody = document.querySelector('#table-activity-log tbody');
    if (!tbody) return;
    tbody.innerHTML = state.activityLog.slice(-20).reverse().map(log => `<tr><td>${new Date(log.Timestamp).toLocaleString()}</td><td>${log.User}</td><td>${log.Action}</td><td>${log.Description}</td></tr>`).join('');
}
