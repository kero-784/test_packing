import { state } from './state.js';
import { _t } from './i18n.js';
import { findByKey, userCan, getVisibleBranchesForCurrentUser } from './utils.js';
import { calculateStockLevels, calculateSupplierFinancials, calculateHistoricalCosts } from './calculations.js';
import { openItemSelectorModal, openInvoiceSelectorModal, openEditModal, openHistoryModal, openViewTransferModal, openPOEditModal, openInvoiceEditModal, openApproveRequestModal } from './ui.js';

// --- Grand Total Updaters ---
export function updateReceiveGrandTotal() { let grandTotal = 0; (state.currentReceiveList || []).forEach(item => { grandTotal += (parseFloat(item.quantity) || 0) * (parseFloat(item.cost) || 0); }); document.getElementById('receive-grand-total').textContent = `${grandTotal.toFixed(2)} EGP`; }
export function updateTransferGrandTotal() { let grandTotalQty = 0; (state.currentTransferList || []).forEach(item => { grandTotalQty += (parseFloat(item.quantity) || 0); }); document.getElementById('transfer-grand-total').textContent = grandTotalQty.toFixed(2); }
export function updateIssueGrandTotal() { let grandTotalQty = 0; (state.currentIssueList || []).forEach(item => { grandTotalQty += (parseFloat(item.quantity) || 0); }); document.getElementById('issue-grand-total').textContent = grandTotalQty.toFixed(2); }
export function updatePOGrandTotal() { let grandTotal = 0; (state.currentPOList || []).forEach(item => { grandTotal += (parseFloat(item.quantity) || 0) * (parseFloat(item.cost) || 0); }); document.getElementById('po-grand-total').textContent = `${grandTotal.toFixed(2)} EGP`; }
export function updatePOEditGrandTotal() { let grandTotal = 0; (state.currentEditingPOList || []).forEach(item => { grandTotal += (parseFloat(item.quantity) || 0) * (parseFloat(item.cost) || 0); }); document.getElementById('edit-po-grand-total').textContent = `${grandTotal.toFixed(2)} EGP`; }
export function updateReturnGrandTotal() { let grandTotal = 0; (state.currentReturnList || []).forEach(item => { grandTotal += (parseFloat(item.quantity) || 0) * (parseFloat(item.cost) || 0); }); document.getElementById('return-grand-total').textContent = `${grandTotal.toFixed(2)} EGP`; }

// --- Master Data Tables ---
export function renderItemsTable(data = state.items) {
    const tbody = document.getElementById('table-items').querySelector('tbody');
    tbody.innerHTML = '';
    if (!data || data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">${_t('no_items_found')}</td></tr>`;
        return;
    }
    const canEdit = userCan('editItem');
    data.forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${item.code}</td><td>${item.name}</td><td>${_t(item.category?.toLowerCase()) || item.category || 'N/A'}</td><td>${item.unit}</td><td>${(parseFloat(item.cost) || 0).toFixed(2)} EGP</td><td><div class="action-buttons"><button class="secondary small btn-edit" data-type="item" data-id="${item.code}" ${!canEdit ? 'disabled' : ''}>${_t('edit')}</button><button class="secondary small btn-history" data-type="item" data-id="${item.code}">${_t('history')}</button></div></td>`;
        tbody.appendChild(tr);
    });
}

export function renderSuppliersTable(data = state.suppliers) {
    const tbody = document.getElementById('table-suppliers').querySelector('tbody');
    tbody.innerHTML = '';
    if (!data || data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">${_t('no_suppliers_found')}</td></tr>`;
        return;
    }
    const financials = calculateSupplierFinancials();
    const canEdit = userCan('editSupplier');
    data.forEach(supplier => {
        const balance = financials[supplier.supplierCode]?.balance || 0;
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${supplier.supplierCode || ''}</td><td>${supplier.name}</td><td>${supplier.contact}</td><td>${balance.toFixed(2)} EGP</td><td>${canEdit ? `<button class="secondary small btn-edit" data-type="supplier" data-id="${supplier.supplierCode}">${_t('edit')}</button>`: 'N/A'}</td>`;
        tbody.appendChild(tr);
    });
}

export function renderBranchesTable(data = state.branches) {
    const tbody = document.getElementById('table-branches').querySelector('tbody');
    tbody.innerHTML = '';
    if (!data || data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;">${_t('no_branches_found')}</td></tr>`;
        return;
    }
    const canEdit = userCan('editBranch');
    data.forEach(branch => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${branch.branchCode || ''}</td><td>${branch.branchName}</td><td>${canEdit ? `<button class="secondary small btn-edit" data-type="branch" data-id="${branch.branchCode}">${_t('edit')}</button>`: 'N/A'}</td>`;
        tbody.appendChild(tr);
    });
}

export function renderSectionsTable(data = state.sections) {
    const tbody = document.getElementById('table-sections').querySelector('tbody');
    tbody.innerHTML = '';
    if (!data || data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;">${_t('no_sections_found')}</td></tr>`;
        return;
    }
    const canEdit = userCan('editSection');
    data.forEach(section => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${section.sectionCode || ''}</td><td>${section.sectionName}</td><td>${canEdit ? `<button class="secondary small btn-edit" data-type="section" data-id="${section.sectionCode}">${_t('edit')}</button>`: 'N/A'}</td>`;
        tbody.appendChild(tr);
    });
}

// --- Dynamic Input Tables ---
export const renderDynamicListTable = (tbodyId, list, columnsConfig, emptyMessage, totalizerFn) => {
    const tableEl = document.getElementById(tbodyId);
    if (!tableEl) return;
    const tbody = tableEl.querySelector('tbody');
    tbody.innerHTML = '';
    if (!list || list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${columnsConfig.length + 1}" style="text-align:center;">${_t(emptyMessage)}</td></tr>`;
        if (totalizerFn) totalizerFn();
        return;
    }
    const stock = calculateStockLevels();
    list.forEach((item, index) => {
        const tr = document.createElement('tr');
        let cellsHtml = '';
        columnsConfig.forEach(col => {
            let content = '';
            const fromBranch = document.getElementById(col.branchSelectId)?.value;
            const availableStock = (stock[fromBranch]?.[item.itemCode]?.quantity || 0);
            switch (col.type) {
                case 'text': content = item[col.key]; break;
                case 'number_input': content = `<input type="number" class="table-input" value="${item[col.key] || ''}" min="${col.min || 0.01}" ${col.maxKey ? `max="${availableStock}"` : ''} step="${col.step || 0.01}" data-index="${index}" data-field="${col.key}">`; break;
                case 'cost_input': content = `<input type="number" class="table-input" value="${(item.cost || 0).toFixed(2)}" min="0" step="0.01" data-index="${index}" data-field="cost">`; break;
                case 'calculated': content = `<span>${col.calculator(item)}</span>`; break;
                case 'available_stock': content = availableStock.toFixed(2); break;
                case 'physical_input': content = `<input type="number" class="table-input" value="${item.physicalCount || ''}" min="0" step="0.01" data-index="${index}" data-field="physicalCount">`; break;
            }
            cellsHtml += `<td>${content}</td>`;
        });
        cellsHtml += `<td><button class="danger small" data-index="${index}">X</button></td>`;
        tr.innerHTML = cellsHtml;
        tbody.appendChild(tr);
    });
    if (totalizerFn) totalizerFn();
};

export function renderReceiveListTable() { renderDynamicListTable('table-receive-list', state.currentReceiveList, [ { type: 'text', key: 'itemCode' }, { type: 'text', key: 'itemName' }, { type: 'number_input', key: 'quantity' }, { type: 'cost_input', key: 'cost' }, { type: 'calculated', calculator: item => `${((parseFloat(item.quantity) || 0) * (parseFloat(item.cost) || 0)).toFixed(2)} EGP` } ], 'no_items_selected_toast', updateReceiveGrandTotal); }
export function renderTransferListTable() { renderDynamicListTable('table-transfer-list', state.currentTransferList, [ { type: 'text', key: 'itemCode' }, { type: 'text', key: 'itemName' }, { type: 'available_stock', branchSelectId: 'transfer-from-branch' }, { type: 'number_input', key: 'quantity', maxKey: true, branchSelectId: 'transfer-from-branch' } ], 'no_items_selected_toast', updateTransferGrandTotal); }
export function renderIssueListTable() { renderDynamicListTable('table-issue-list', state.currentIssueList, [ { type: 'text', key: 'itemCode' }, { type: 'text', key: 'itemName' }, { type: 'available_stock', branchSelectId: 'issue-from-branch' }, { type: 'number_input', key: 'quantity', maxKey: true, branchSelectId: 'issue-from-branch' } ], 'no_items_selected_toast', updateIssueGrandTotal); }
export function renderPOListTable() { renderDynamicListTable('table-po-list', state.currentPOList, [ { type: 'text', key: 'itemCode' }, { type: 'text', key: 'itemName' }, { type: 'number_input', key: 'quantity' }, { type: 'cost_input', key: 'cost' }, { type: 'calculated', calculator: item => `${((parseFloat(item.quantity) || 0) * (parseFloat(item.cost) || 0)).toFixed(2)} EGP` } ], 'no_items_selected_toast', updatePOGrandTotal); }
export function renderPOEditListTable() { renderDynamicListTable('table-edit-po-list', state.currentEditingPOList, [ { type: 'text', key: 'itemCode' }, { type: 'text', key: 'itemName' }, { type: 'number_input', key: 'quantity' }, { type: 'cost_input', key: 'cost' }, { type: 'calculated', calculator: item => `${((parseFloat(item.quantity) || 0) * (parseFloat(item.cost) || 0)).toFixed(2)} EGP` } ], 'no_items_selected_toast', updatePOEditGrandTotal); }
export function renderReturnListTable() { renderDynamicListTable('table-return-list', state.currentReturnList, [ { type: 'text', key: 'itemCode' }, { type: 'text', key: 'itemName' }, { type: 'available_stock', branchSelectId: 'return-branch' }, { type: 'number_input', key: 'quantity', maxKey: true, branchSelectId: 'return-branch' }, { type: 'cost_input', key: 'cost' } ], 'no_items_selected_toast', updateReturnGrandTotal); }
export function renderRequestListTable() { renderDynamicListTable('table-request-list', state.currentRequestList, [ { type: 'text', key: 'itemCode' }, { type: 'text', key: 'itemName' }, { type: 'number_input', key: 'quantity' } ], 'no_items_selected_toast', null); }

export function renderAdjustmentListTable() {
    const tbody = document.getElementById('table-adjustment-list').querySelector('tbody');
    tbody.innerHTML = '';
    if (!state.currentAdjustmentList || state.currentAdjustmentList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">${_t('no_items_for_adjustment')}</td></tr>`;
        return;
    }
    const stock = calculateStockLevels();
    const branchCode = document.getElementById('adjustment-branch').value;

    state.currentAdjustmentList.forEach((item, index) => {
        const systemQty = (branchCode && stock[branchCode]?.[item.itemCode]?.quantity) || 0;
        const physicalCount = typeof item.physicalCount !== 'undefined' ? item.physicalCount : '';
        const adjustment = (parseFloat(physicalCount) || 0) - systemQty;
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${item.itemCode}</td>
            <td>${item.itemName}</td>
            <td>${systemQty.toFixed(2)}</td>
            <td><input type="number" class="table-input" value="${physicalCount}" min="0" step="0.01" data-index="${index}" data-field="physicalCount"></td>
            <td style="font-weight: bold; color: ${adjustment > 0 ? 'var(--secondary-color)' : (adjustment < 0 ? 'var(--danger-color)' : 'inherit')}">${adjustment.toFixed(2)}</td>
            <td><button class="danger small" data-index="${index}">X</button></td>
        `;
        tbody.appendChild(tr);
    });
}

// --- Reports & Inquiry ---
export function renderItemCentricStockView(itemsToRender = state.items) {
    const container = document.getElementById('item-centric-stock-container');
    if (!container) return;
    const stockByBranch = calculateStockLevels();
    const branchesToDisplay = getVisibleBranchesForCurrentUser();
    let tableHTML = `<table id="table-stock-levels-by-item"><thead><tr><th>${_t('table_h_code')}</th><th>${_t('table_h_name')}</th>`;
    branchesToDisplay.forEach(b => { tableHTML += `<th>${b.branchName}</th>` });
    tableHTML += `<th>${_t('table_h_total')}</th></tr></thead><tbody>`;
    itemsToRender.forEach(item => {
        tableHTML += `<tr><td>${item.code}</td><td>${item.name}</td>`;
        let total = 0;
        branchesToDisplay.forEach(branch => {
            const qty = stockByBranch[branch.branchCode]?.[item.code]?.quantity || 0;
            total += qty;
            tableHTML += `<td>${qty > 0 ? qty.toFixed(2) : '-'}</td>`;
        });
        tableHTML += `<td><strong>${total.toFixed(2)}</strong></td></tr>`;
    });
    tableHTML += `</tbody></table>`;
    container.innerHTML = tableHTML;
}

export function renderItemInquiry(searchTerm) {
    const resultsContainer = document.getElementById('item-inquiry-results');
    if (!searchTerm) { resultsContainer.innerHTML = ''; return; }
    const stockByBranch = calculateStockLevels();
    const filteredItems = state.items.filter(i => i.name.toLowerCase().includes(searchTerm) || i.code.toLowerCase().includes(searchTerm));
    let html = '';
    const branchesToDisplay = getVisibleBranchesForCurrentUser();
    filteredItems.slice(0, 10).forEach(item => {
        html += `<h4>${item.name} (${item.code})</h4><table><thead><tr><th>${_t('branch')}</th><th>${_t('table_h_qty')}</th><th>${_t('table_h_value')}</th></tr></thead><tbody>`;
        let found = false, totalQty = 0, totalValue = 0;
        branchesToDisplay.forEach(branch => {
            const itemStock = stockByBranch[branch.branchCode]?.[item.code];
            if (itemStock && itemStock.quantity > 0) {
                const value = itemStock.quantity * itemStock.avgCost;
                html += `<tr><td>${branch.branchName}</td><td>${itemStock.quantity.toFixed(2)}</td><td>${value.toFixed(2)} EGP</td></tr>`;
                totalQty += itemStock.quantity; totalValue += value; found = true;
            }
        });
        if (!found) html += `<tr><td colspan="3">${_t('no_stock_for_item')}</td></tr>`;
        else html += `<tr style="font-weight:bold; background-color: var(--bg-color);"><td>${_t('table_h_total')}</td><td>${totalQty.toFixed(2)}</td><td>${totalValue.toFixed(2)} EGP</td></tr>`;
        html += `</tbody></table><hr>`;
    });
    resultsContainer.innerHTML = html;
}

// --- Transaction History ---
export function renderTransactionHistory(filters = {}) {
    const tbody = document.getElementById('table-transaction-history').querySelector('tbody');
    tbody.innerHTML = '';
    
    let allTx = [...state.transactions];
    let allPo = [...state.purchaseOrders];

    if (!userCan('viewAllBranches')) {
        const branchCode = state.currentUser.AssignedBranchCode;
        if (branchCode) {
            allTx = allTx.filter(t => String(t.branchCode) === branchCode || String(t.fromBranchCode) === branchCode || String(t.toBranchCode) === branchCode);
            allPo = []; 
        }
    }
    
    let allHistoryItems = [ ...allTx, ...allPo.map(po => ({...po, type: 'po', batchId: po.poId, ref: po.poId})) ];

    const sDate = filters.startDate ? new Date(filters.startDate) : null;
    if(sDate) sDate.setHours(0,0,0,0);
    const eDate = filters.endDate ? new Date(filters.endDate) : null;
    if(eDate) eDate.setHours(23,59,59,999);

    if (sDate) allHistoryItems = allHistoryItems.filter(t => new Date(t.date) >= sDate);
    if (eDate) allHistoryItems = allHistoryItems.filter(t => new Date(t.date) <= eDate);
    if (filters.type) allHistoryItems = allHistoryItems.filter(t => String(t.type) === String(filters.type));
    if (filters.branch) allHistoryItems = allHistoryItems.filter(t => String(t.branchCode) === String(filters.branch) || String(t.fromBranchCode) === String(filters.branch) || String(t.toBranchCode) === String(filters.branch));
    
    if (filters.searchTerm) {
        const lowerFilter = filters.searchTerm.toLowerCase();
        allHistoryItems = allHistoryItems.filter(t => {
            const item = findByKey(state.items, 'code', t.itemCode);
            return (t.ref && String(t.ref).toLowerCase().includes(lowerFilter)) ||
                   (t.batchId && String(t.batchId).toLowerCase().includes(lowerFilter)) ||
                   (t.invoiceNumber && String(t.invoiceNumber).toLowerCase().includes(lowerFilter)) ||
                   (item && item.name.toLowerCase().includes(lowerFilter));
        });
    }

    const grouped = {};
    allHistoryItems.forEach(t => {
        const key = t.batchId;
        if (!key) return;
        if (!grouped[key]) grouped[key] = { date: t.date, type: t.type, batchId: key, transactions: [] };
        grouped[key].transactions.push(t);
    });

    Object.values(grouped).sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(group => {
        const first = group.transactions[0];
        let details = '', statusTag = '', refNum = first.ref || first.batchId, typeDisplay = first.type.replace(/_/g, ' ').toUpperCase();
        const canEditInvoice = userCan('opEditInvoice') && first.type === 'receive' && (first.isApproved !== true && String(first.isApproved).toUpperCase() !== 'TRUE');

        let actionsHtml = `<button class="secondary small btn-view-tx" data-batch-id="${group.batchId}" data-type="${first.type}">${_t('view_print')}</button>`;
        if(canEditInvoice) actionsHtml += `<button class="secondary small btn-edit-invoice" data-batch-id="${group.batchId}">${_t('edit')}</button>`;

        switch(first.type) {
            case 'receive':
                details = `${_t('receive')} ${group.transactions.length} items from <strong>${findByKey(state.suppliers, 'supplierCode', first.supplierCode)?.name || 'N/A'}</strong>`;
                refNum = first.invoiceNumber;
                statusTag = first.isApproved === true || String(first.isApproved).toUpperCase() === 'TRUE' ? `<span class="status-tag status-approved">${_t('status_approved')}</span>` : `<span class="status-tag status-pendingapproval">${_t('status_pending')}</span>`;
                break;
            case 'transfer_out':
            case 'transfer_in':
                 details = `${_t('transfer')} from <strong>${findByKey(state.branches, 'branchCode', first.fromBranchCode)?.branchName || 'N/A'}</strong> to <strong>${findByKey(state.branches, 'branchCode', first.toBranchCode)?.branchName || 'N/A'}</strong>`;
                 statusTag = `<span class="status-tag status-${(first.Status || '').toLowerCase().replace(/ /g,'')}">${_t('status_' + (first.Status || '').toLowerCase().replace(/ /g,''))}</span>`;
                 break;
            case 'po':
                details = `${_t('po')} for <strong>${findByKey(state.suppliers, 'supplierCode', first.supplierCode)?.name || 'N/A'}</strong>`;
                statusTag = `<span class="status-tag status-${(first.Status || 'pending').toLowerCase().replace(/ /g,'')}">${_t('status_' + (first.Status || 'pending').toLowerCase().replace(/ /g,''))}</span>`;
                break;
            // ... more cases as per original script.js logic ...
        }
        
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${new Date(first.date).toLocaleString()}</td><td>${typeDisplay}</td><td>${refNum}</td><td>${details}</td><td>${statusTag}</td><td><div class="action-buttons">${actionsHtml}</div></td>`;
        tbody.appendChild(tr);
    });
}

// --- Admin & Logs ---
export function renderActivityLog() {
    const tbody = document.getElementById('table-activity-log').querySelector('tbody');
    tbody.innerHTML = '';
    if (!state.activityLog || state.activityLog.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;">No activity logged.</td></tr>`;
        return;
    }
    state.activityLog.slice().reverse().forEach(log => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${new Date(log.Timestamp).toLocaleString()}</td><td>${log.User || 'N/A'}</td><td>${log.Action}</td><td>${log.Description}</td>`;
        tbody.appendChild(tr);
    });
}

export function renderUserManagementUI() {
    const usersTbody = document.getElementById('table-users').querySelector('tbody');
    usersTbody.innerHTML = '';
    (state.allUsers || []).forEach(user => {
        const tr = document.createElement('tr');
        const assigned = findByKey(state.branches, 'branchCode', user.AssignedBranchCode)?.branchName || findByKey(state.sections, 'sectionCode', user.AssignedSectionCode)?.sectionName || 'N/A';
        const isDisabled = user.isDisabled === true || String(user.isDisabled).toUpperCase() === 'TRUE';
        tr.innerHTML = `<td>${user.Username}</td><td>${user.Name}</td><td>${user.RoleName}</td><td>${assigned}</td><td><span class="status-tag ${isDisabled ? 'status-rejected' : 'status-approved'}">${isDisabled ? 'Disabled' : 'Active'}</span></td><td><button class="secondary small btn-edit" data-type="user" data-id="${user.Username}">${_t('edit')}</button></td>`;
        usersTbody.appendChild(tr);
    });
    const rolesTbody = document.getElementById('table-roles').querySelector('tbody');
    rolesTbody.innerHTML = '';
    (state.allRoles || []).forEach(role => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${role.RoleName}</td><td><button class="secondary small btn-edit" data-type="role" data-id="${role.RoleName}">${_t('edit')}</button></td>`;
        rolesTbody.appendChild(tr);
    });
}

export function updatePendingRequestsWidget() {
    const widget = document.getElementById('pending-requests-widget');
    if (!userCan('opApproveIssueRequest') && !userCan('opApproveResupplyRequest')) {
        widget.style.display = 'none'; return;
    }
    const pendingRequests = (state.itemRequests || []).filter(r => r.Status === 'Pending' && (userCan('viewAllBranches') || r.ToBranch === state.currentUser.AssignedBranchCode));
    const count = new Set(pendingRequests.map(r => r.RequestID)).size;
    if(count > 0) {
        document.getElementById('pending-requests-count').textContent = count;
        widget.style.display = 'flex';
    } else {
        widget.style.display = 'none';
    }
}