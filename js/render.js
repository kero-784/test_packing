import { state } from './state.js';
import { _t } from './i18n.js';
import { findByKey, userCan, getVisibleBranchesForCurrentUser } from './utils.js';
import { calculateStockLevels, calculateSupplierFinancials } from './calculations.js';
import { openEditModal, openHistoryModal } from './ui.js';

// --- Grand Total Updaters ---
export function updateReceiveGrandTotal() { 
    let gt = 0; 
    state.currentReceiveList.forEach(i => gt += (parseFloat(i.quantity) || 0) * (parseFloat(i.cost) || 0)); 
    document.getElementById('receive-grand-total').textContent = `${gt.toFixed(2)} EGP`; 
}
export function updateTransferGrandTotal() { 
    let gt = 0; 
    state.currentTransferList.forEach(i => gt += (parseFloat(i.quantity) || 0)); 
    document.getElementById('transfer-grand-total').textContent = gt.toFixed(2); 
}
export function updateIssueGrandTotal() { 
    let gt = 0; 
    state.currentIssueList.forEach(i => gt += (parseFloat(i.quantity) || 0)); 
    document.getElementById('issue-grand-total').textContent = gt.toFixed(2); 
}

// --- Master Data Tables ---
export function renderItemsTable(data = state.items) {
    const tbody = document.getElementById('table-items').querySelector('tbody');
    tbody.innerHTML = data.map(item => `
        <tr>
            <td>${item.code}</td>
            <td>${item.name}</td>
            <td>${item.category}</td>
            <td>${item.unit}</td>
            <td>${(parseFloat(item.cost) || 0).toFixed(2)} EGP</td>
            <td>
                <button class="secondary small btn-edit" data-type="item" data-id="${item.code}">Edit</button>
                <button class="secondary small btn-history" data-id="${item.code}">History</button>
            </td>
        </tr>
    `).join('') || '<tr><td colspan="6">No items found.</td></tr>';
}

export function renderSuppliersTable(data = state.suppliers) {
    const tbody = document.getElementById('table-suppliers').querySelector('tbody');
    const financials = calculateSupplierFinancials();
    tbody.innerHTML = data.map(s => `
        <tr>
            <td>${s.supplierCode}</td>
            <td>${s.name}</td>
            <td>${s.contact}</td>
            <td>${(financials[s.supplierCode]?.balance || 0).toFixed(2)} EGP</td>
            <td><button class="secondary small btn-edit" data-type="supplier" data-id="${s.supplierCode}">Edit</button></td>
        </tr>
    `).join('') || '<tr><td colspan="5">No suppliers found.</td></tr>';
}

// --- Dynamic Input Tables ---
export function renderReceiveListTable() {
    const tbody = document.getElementById('table-receive-list').querySelector('tbody');
    tbody.innerHTML = state.currentReceiveList.map((item, idx) => `
        <tr>
            <td>${item.itemCode}</td>
            <td>${item.itemName}</td>
            <td><input type="number" class="table-input" data-index="${idx}" data-field="quantity" value="${item.quantity}"></td>
            <td><input type="number" class="table-input" data-index="${idx}" data-field="cost" value="${item.cost}"></td>
            <td>${(item.quantity * item.cost).toFixed(2)}</td>
            <td><button class="danger small btn-remove-row" data-index="${idx}">X</button></td>
        </tr>
    `).join('');
    updateReceiveGrandTotal();
}

export function renderIssueListTable() {
    const tbody = document.getElementById('table-issue-list').querySelector('tbody');
    tbody.innerHTML = state.currentIssueList.map((item, idx) => `
        <tr>
            <td>${item.itemCode}</td>
            <td>${item.itemName}</td>
            <td><input type="number" class="table-input" data-index="${idx}" data-field="quantity" value="${item.quantity}"></td>
            <td><button class="danger small btn-remove-row" data-index="${idx}">X</button></td>
        </tr>
    `).join('');
    updateIssueGrandTotal();
}

export function renderTransferListTable() {
    const tbody = document.getElementById('table-transfer-list').querySelector('tbody');
    tbody.innerHTML = state.currentTransferList.map((item, idx) => `
        <tr>
            <td>${item.itemCode}</td>
            <td>${item.itemName}</td>
            <td><input type="number" class="table-input" data-index="${idx}" data-field="quantity" value="${item.quantity}"></td>
            <td><button class="danger small btn-remove-row" data-index="${idx}">X</button></td>
        </tr>
    `).join('');
    updateTransferGrandTotal();
}

export function renderAdjustmentListTable() {
    const tbody = document.getElementById('table-adjustment-list').querySelector('tbody');
    tbody.innerHTML = state.currentAdjustmentList.map((item, idx) => `
        <tr>
            <td>${item.itemCode}</td>
            <td>${item.itemName}</td>
            <td><input type="number" class="table-input" data-index="${idx}" data-field="physicalCount" value="${item.physicalCount || 0}"></td>
            <td><button class="danger small btn-remove-row" data-index="${idx}">X</button></td>
        </tr>
    `).join('');
}

// --- Stock Views ---
export function renderItemCentricStockView(itemsToRender = state.items) {
    const container = document.getElementById('item-centric-stock-container');
    const stock = calculateStockLevels();
    const branches = getVisibleBranchesForCurrentUser();
    
    let html = '<table><thead><tr><th>Code</th><th>Name</th>';
    branches.forEach(b => html += `<th>${b.branchName}</th>`);
    html += '<th>Total</th></tr></thead><tbody>';
    
    itemsToRender.forEach(item => {
        html += `<tr><td>${item.code}</td><td>${item.name}</td>`;
        let total = 0;
        branches.forEach(b => {
            const q = stock[b.branchCode]?.[item.code]?.quantity || 0;
            total += q;
            html += `<td>${q.toFixed(2)}</td>`;
        });
        html += `<td><strong>${total.toFixed(2)}</strong></td></tr>`;
    });
    
    html += '</tbody></table>';
    container.innerHTML = html;
}

export function renderItemInquiry(term) {
    const container = document.getElementById('item-inquiry-results');
    if (!term) { container.innerHTML = ''; return; }
    const stock = calculateStockLevels();
    const filtered = state.items.filter(i => i.name.toLowerCase().includes(term) || i.code.toLowerCase().includes(term));
    container.innerHTML = filtered.slice(0, 5).map(item => {
        let rows = '';
        state.branches.forEach(b => {
            const q = stock[b.branchCode]?.[item.code]?.quantity || 0;
            if(q > 0) rows += `<tr><td>${b.branchName}</td><td>${q.toFixed(2)}</td></tr>`;
        });
        return `<h4>${item.name}</h4><table>${rows || '<tr><td>No stock</td></tr>'}</table>`;
    }).join('');
}

export function renderTransactionHistory(filters) {
    const tbody = document.getElementById('table-transaction-history').querySelector('tbody');
    const txs = state.transactions.slice().reverse().filter(tx => {
        if (filters.type && tx.type !== filters.type) return false;
        if (filters.branch && tx.branchCode !== filters.branch) return false;
        return true;
    });

    tbody.innerHTML = txs.slice(0, 50).map(tx => `
        <tr>
            <td>${new Date(tx.date).toLocaleDateString()}</td>
            <td>${tx.type.toUpperCase()}</td>
            <td>${tx.ref || tx.batchId}</td>
            <td>${tx.itemCode}</td>
            <td>${tx.quantity}</td>
            <td><button class="secondary small">View</button></td>
        </tr>
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
    const tbody = document.getElementById('table-users').querySelector('tbody');
    tbody.innerHTML = state.allUsers.map(u => `
        <tr>
            <td>${u.Username}</td>
            <td>${u.Name}</td>
            <td>${u.RoleName}</td>
            <td>${u.AssignedBranchCode || 'Global'}</td>
            <td>Active</td>
            <td><button class="secondary small btn-edit" data-type="user" data-id="${u.Username}">Edit</button></td>
        </tr>
    `).join('');
}

export function renderActivityLog() {
    const tbody = document.getElementById('table-activity-log').querySelector('tbody');
    tbody.innerHTML = state.activityLog.slice(-50).reverse().map(log => `
        <tr>
            <td>${new Date(log.Timestamp).toLocaleString()}</td>
            <td>${log.User}</td>
            <td>${log.Action}</td>
            <td>${log.Description}</td>
        </tr>
    `).join('');
}
