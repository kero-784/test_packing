// ui-renderers.js

// --- HELPER FUNCTIONS ---
function getVisibleBranchesForCurrentUser() {
    if (!state.currentUser) return [];
    if (userCan('viewAllBranches')) { return state.branches; }
    if (state.currentUser.AssignedBranchCode) { return state.branches.filter(b => String(b.branchCode) === String(state.currentUser.AssignedBranchCode)); }
    return [];
}

// --- TABLE RENDERERS ---
function renderItemsTable(data = state.items) {
    const table = document.getElementById('table-items');
    if (!table) return;
    const tbody = table.querySelector('tbody');
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

function renderSuppliersTable(data = state.suppliers) {
    const table = document.getElementById('table-suppliers');
    if (!table) return;
    const tbody = table.querySelector('tbody');
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

function renderBranchesTable(data = state.branches) {
    const table = document.getElementById('table-branches');
    if (!table) return;
    const tbody = table.querySelector('tbody');
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

function renderSectionsTable(data = state.sections) {
    const table = document.getElementById('table-sections');
    if (!table) return;
    const tbody = table.querySelector('tbody');
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

const renderDynamicListTable = (tbodyId, list, columnsConfig, emptyMessage, totalizerFn) => {
    const table = document.getElementById(tbodyId);
    if (!table) return;
    const tbody = table.querySelector('tbody');
    if (!tbody) return;
    
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
            const fromBranchEl = document.getElementById(col.branchSelectId);
            const fromBranch = fromBranchEl ? fromBranchEl.value : null;
            const availableStock = (stock[fromBranch]?.[item.itemCode]?.quantity || 0);
            switch (col.type) {
                case 'text': content = item[col.key]; break;
                case 'number_input': content = `<input type="number" class="table-input" value="${item[col.key] || ''}" min="${col.min || 0.01}" ${col.maxKey ? `max="${availableStock}"` : ''} step="${col.step || 0.01}" data-index="${index}" data-field="${col.key}">`; break;
                case 'cost_input': content = `<input type="number" class="table-input" value="${(item.cost || 0).toFixed(2)}" min="0" step="0.01" data-index="${index}" data-field="cost">`; break;
                case 'calculated': content = `<span>${col.calculator(item)}</span>`; break;
                case 'available_stock': content = availableStock.toFixed(2); break;
            }
            cellsHtml += `<td>${content}</td>`;
        });
        cellsHtml += `<td><button class="danger small" data-index="${index}">X</button></td>`;
        tr.innerHTML = cellsHtml;
        tbody.appendChild(tr);
    });
    if (totalizerFn) totalizerFn();
};

function renderReceiveListTable() { renderDynamicListTable('table-receive-list', state.currentReceiveList, [ { type: 'text', key: 'itemCode' }, { type: 'text', key: 'itemName' }, { type: 'number_input', key: 'quantity' }, { type: 'cost_input', key: 'cost' }, { type: 'calculated', calculator: item => `${((parseFloat(item.quantity) || 0) * (parseFloat(item.cost) || 0)).toFixed(2)} EGP` } ], 'no_items_selected_toast', updateReceiveGrandTotal); }
function renderTransferListTable() { renderDynamicListTable('table-transfer-list', state.currentTransferList, [ { type: 'text', key: 'itemCode' }, { type: 'text', key: 'itemName' }, { type: 'available_stock', branchSelectId: 'transfer-from-branch' }, { type: 'number_input', key: 'quantity', maxKey: true, branchSelectId: 'transfer-from-branch' } ], 'no_items_selected_toast', updateTransferGrandTotal); }
function renderIssueListTable() { renderDynamicListTable('table-issue-list', state.currentIssueList, [ { type: 'text', key: 'itemCode' }, { type: 'text', key: 'itemName' }, { type: 'available_stock', branchSelectId: 'issue-from-branch' }, { type: 'number_input', key: 'quantity', maxKey: true, branchSelectId: 'issue-from-branch' } ], 'no_items_selected_toast', updateIssueGrandTotal); }
function renderPOListTable() { renderDynamicListTable('table-po-list', state.currentPOList, [ { type: 'text', key: 'itemCode' }, { type: 'text', key: 'itemName' }, { type: 'number_input', key: 'quantity' }, { type: 'cost_input', key: 'cost' }, { type: 'calculated', calculator: item => `${((parseFloat(item.quantity) || 0) * (parseFloat(item.cost) || 0)).toFixed(2)} EGP` } ], 'no_items_selected_toast', updatePOGrandTotal); }
function renderPOEditListTable() { renderDynamicListTable('table-edit-po-list', state.currentEditingPOList, [ { type: 'text', key: 'itemCode' }, { type: 'text', key: 'itemName' }, { type: 'number_input', key: 'quantity' }, { type: 'cost_input', key: 'cost' }, { type: 'calculated', calculator: item => `${((parseFloat(item.quantity) || 0) * (parseFloat(item.cost) || 0)).toFixed(2)} EGP` } ], 'no_items_selected_toast', updatePOEditGrandTotal); }
function renderReturnListTable() { renderDynamicListTable('table-return-list', state.currentReturnList, [ { type: 'text', key: 'itemCode' }, { type: 'text', key: 'itemName' }, { type: 'available_stock', branchSelectId: 'return-branch' }, { type: 'number_input', key: 'quantity', maxKey: true, branchSelectId: 'return-branch' }, { type: 'cost_input', key: 'cost' } ], 'no_items_selected_toast', updateReturnGrandTotal); }
function renderRequestListTable() { renderDynamicListTable('table-request-list', state.currentRequestList, [ { type: 'text', key: 'itemCode' }, { type: 'text', key: 'itemName' }, { type: 'number_input', key: 'quantity' } ], 'no_items_selected_toast', null); }

function renderAdjustmentListTable() {
    const table = document.getElementById('table-adjustment-list');
    if (!table) return;
    const tbody = table.querySelector('tbody');
    tbody.innerHTML = '';
    if (!state.currentAdjustmentList || state.currentAdjustmentList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">${_t('no_items_for_adjustment')}</td></tr>`;
        return;
    }
    const stock = calculateStockLevels();
    const branchCodeEl = document.getElementById('adjustment-branch');
    const branchCode = branchCodeEl ? branchCodeEl.value : null;

    state.currentAdjustmentList.forEach((item, index) => {
        const systemQty = (branchCode && stock[branchCode]?.[item.itemCode]?.quantity) || 0;
        const physicalCount = typeof item.physicalCount !== 'undefined' ? item.physicalCount : '';
        const adjustment = physicalCount - systemQty;
        item.physicalCount = physicalCount;
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${item.itemCode}</td><td>${item.itemName}</td><td>${systemQty.toFixed(2)}</td><td><input type="number" class="table-input" value="${physicalCount}" min="0" step="0.01" data-index="${index}" data-field="physicalCount"></td><td style="font-weight: bold; color: ${adjustment > 0 ? 'var(--secondary-color)' : (adjustment < 0 ? 'var(--danger-color)' : 'inherit')}">${adjustment.toFixed(2)}</td><td><button class="danger small" data-index="${index}">X</button></td>`;
        tbody.appendChild(tr);
    });
}

function renderItemCentricStockView(itemsToRender = state.items) {
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

function renderItemInquiry(searchTerm) {
    const resultsContainer = document.getElementById('item-inquiry-results');
    if (!resultsContainer) return;
    if (!searchTerm) {
        resultsContainer.innerHTML = '';
        return;
    }
    const stockByBranch = calculateStockLevels();
    const filteredItems = state.items.filter(i => i.name.toLowerCase().includes(searchTerm) || i.code.toLowerCase().includes(searchTerm));
    let html = '';
    const branchesToDisplay = getVisibleBranchesForCurrentUser();
    filteredItems.slice(0, 10).forEach(item => {
        html += `<h4>${item.name} (${item.code})</h4><table><thead><tr><th>${_t('branch')}</th><th>${_t('table_h_qty')}</th><th>${_t('table_h_value')}</th></tr></thead><tbody>`;
        let found = false;
        let totalQty = 0;
        let totalValue = 0;
        branchesToDisplay.forEach(branch => {
            const itemStock = stockByBranch[branch.branchCode]?.[item.code];
            if (itemStock && itemStock.quantity > 0) {
                const value = itemStock.quantity * itemStock.avgCost;
                html += `<tr><td>${branch.branchName} (${branch.branchCode || ''})</td><td>${itemStock.quantity.toFixed(2)}</td><td>${value.toFixed(2)} EGP</td></tr>`;
                totalQty += itemStock.quantity;
                totalValue += value;
                found = true;
            }
        });
        if (!found) {
            html += `<tr><td colspan="3">${_t('no_stock_for_item')}</td></tr>`;
        } else {
            html += `<tr style="font-weight:bold; background-color: var(--bg-color);"><td>${_t('table_h_total')}</td><td>${totalQty.toFixed(2)}</td><td>${totalValue.toFixed(2)} EGP</td></tr>`
        }
        html += `</tbody></table><hr>`;
    });
    resultsContainer.innerHTML = html;
}

function renderPaymentList() {
    const supplierEl = document.getElementById('payment-supplier-select');
    const container = document.getElementById('payment-invoice-list-container');
    if (!supplierEl || !container) return;
    
    const supplierCode = supplierEl.value;
    if (!supplierCode) { container.style.display = 'none'; return; }
    
    const supplierInvoices = calculateSupplierFinancials()[supplierCode]?.invoices;
    const table = document.getElementById('table-payment-list');
    if (!table) return;
    const tableBody = table.querySelector('tbody');
    tableBody.innerHTML = '';
    let total = 0;
    
    if (state.invoiceModalSelections.size === 0) { container.style.display = 'none'; return; }
    
    state.invoiceModalSelections.forEach(invNum => {
        const invoice = supplierInvoices[invNum];
        if (!invoice) return;
        const balance = invoice.balance;
        total += balance;
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${invoice.number}</td><td>${balance.toFixed(2)} EGP</td><td><input type="number" class="table-input payment-amount-input" data-invoice="${invoice.number}" value="${balance.toFixed(2)}" step="0.01" min="0" max="${balance.toFixed(2)}" style="max-width: 150px;"></td>`;
        tableBody.appendChild(tr);
    });
    const totalEl = document.getElementById('payment-total-amount');
    if(totalEl) totalEl.textContent = `${total.toFixed(2)} EGP`;
    container.style.display = 'block';
}

function renderPendingTransfers() {
    const container = document.getElementById('pending-transfers-card');
    const table = document.getElementById('table-pending-transfers');
    if(!container || !table) return;
    
    const tbody = table.querySelector('tbody');
    tbody.innerHTML = '';
    const groupedTransfers = {};
    (state.transactions || []).filter(t => t.type === 'transfer_out' && t.Status === 'In Transit').forEach(t => {
        if (!groupedTransfers[t.batchId]) groupedTransfers[t.batchId] = { ...t, items: [] };
        groupedTransfers[t.batchId].items.push(t);
    });
    const visibleTransfers = Object.values(groupedTransfers).filter(t => userCan('viewAllBranches') || t.toBranchCode === state.currentUser.AssignedBranchCode);
    
    if (visibleTransfers.length === 0) { container.style.display = 'none'; return; }
    
    visibleTransfers.forEach(t => {
        const tr = document.createElement('tr');
        const fromBranch = findByKey(state.branches, 'branchCode', t.fromBranchCode)?.branchName || t.fromBranchCode;
        tr.innerHTML = `<td>${new Date(t.date).toLocaleString()}</td><td>${fromBranch}</td><td>${t.ref}</td><td>${t.items.length}</td><td><button class="primary small btn-receive-transfer" data-batch-id="${t.batchId}">${_t('view_confirm')}</button></td>`;
        tbody.appendChild(tr);
    });
    container.style.display = 'block';
}

function renderInTransitReport() {
    const table = document.getElementById('table-in-transit');
    if(!table) return;
    const tbody = table.querySelector('tbody');
    tbody.innerHTML = '';
    const groupedTransfers = {};
    (state.transactions || []).filter(t => t.type === 'transfer_out').forEach(t => {
        if (!groupedTransfers[t.batchId]) groupedTransfers[t.batchId] = { ...t, items: [] };
        groupedTransfers[t.batchId].items.push(t);
    });
    const visibleTransfers = Object.values(groupedTransfers).filter(t => userCan('viewAllBranches') || t.toBranchCode === state.currentUser.AssignedBranchCode || t.fromBranchCode === state.currentUser.AssignedBranchCode);
    
    visibleTransfers.forEach(t => {
        const tr = document.createElement('tr');
        const fromBranch = findByKey(state.branches, 'branchCode', t.fromBranchCode)?.branchName || t.fromBranchCode;
        const toBranch = findByKey(state.branches, 'branchCode', t.toBranchCode)?.branchName || t.toBranchCode;
        const canManage = (userCan('viewAllBranches') || t.fromBranchCode === state.currentUser.AssignedBranchCode) && t.Status === 'In Transit';
        const actions = canManage ? `<div class="action-buttons"><button class="secondary small btn-edit-transfer" data-batch-id="${t.batchId}">${_t('edit')}</button><button class="danger small btn-cancel-transfer" data-batch-id="${t.batchId}">${_t('cancel')}</button></div>` : 'N/A';
        tr.innerHTML = `<td>${new Date(t.date).toLocaleString()}</td><td>${fromBranch}</td><td>${toBranch}</td><td>${t.ref}</td><td>${t.items.length}</td><td><span class="status-tag status-${t.Status.toLowerCase().replace(/ /g,'')}">${_t('status_' + t.Status.toLowerCase().replace(/ /g, ''))}</span></td><td>${actions}</td>`;
        tbody.appendChild(tr);
    });
}

function renderPurchaseOrdersViewer() {
    const table = document.getElementById('table-po-viewer');
    if(!table) return;
    const tbody = table.querySelector('tbody');
    tbody.innerHTML = '';
    (state.purchaseOrders || []).slice().reverse().forEach(po => {
        const supplier = findByKey(state.suppliers, 'supplierCode', po.supplierCode);
        const items = (state.purchaseOrderItems || []).filter(item => item.poId === po.poId);
        const tr = document.createElement('tr');
        const canEditPO = po.Status === 'Pending Approval' && userCan('opCreatePO');
        tr.innerHTML = `<td>${po.poId}</td><td>${new Date(po.date).toLocaleDateString()}</td><td>${supplier?.name || po.supplierCode}</td><td>${items.length}</td><td>${(parseFloat(po.totalValue) || 0).toFixed(2)} EGP</td><td><span class="status-tag status-${(po.Status || 'pending').toLowerCase().replace(/ /g,'')}">${po.Status}</span></td><td><div class="action-buttons"><button class="secondary small btn-view-tx" data-batch-id="${po.poId}" data-type="po">${_t('view_print')}</button>${canEditPO ? `<button class="secondary small btn-edit-po" data-po-id="${po.poId}">${_t('edit')}</button>` : ''}</div></td>`;
        tbody.appendChild(tr);
    });
}

function renderPendingFinancials() {
    const table = document.getElementById('table-pending-financial-approval');
    if(!table) return;
    const tbody = table.querySelector('tbody');
    tbody.innerHTML = '';
    const pendingPOs = (state.purchaseOrders || []).filter(po => po.Status === 'Pending Approval');
    const pendingReceivesGroups = {};
    (state.transactions || []).filter(t => t.type === 'receive' && (t.isApproved === false || String(t.isApproved).toUpperCase() === 'FALSE')).forEach(t => {
        if (!pendingReceivesGroups[t.batchId]) {
            pendingReceivesGroups[t.batchId] = { date: t.date, txType: 'receive', ref: t.invoiceNumber, batchId: t.batchId, details: `GRN from ${findByKey(state.suppliers, 'supplierCode', t.supplierCode)?.name || 'N/A'}`, totalValue: 0 };
        }
        pendingReceivesGroups[t.batchId].totalValue += (parseFloat(t.quantity) || 0) * (parseFloat(t.cost) || 0);
    });
    let allPending = [ ...pendingPOs.map(po => ({...po, txType: 'po', ref: po.poId, value: po.totalValue, details: `PO for ${findByKey(state.suppliers, 'supplierCode', po.supplierCode)?.name || 'N/A'}`})), ...Object.values(pendingReceivesGroups).map(rcv => ({...rcv, value: rcv.totalValue})) ];
    if (allPending.length === 0) { tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">${_t('no_pending_financial_approval')}</td></tr>`; return; }
    allPending.sort((a,b) => new Date(b.date) - new Date(a.date)).forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${new Date(item.date).toLocaleDateString()}</td><td>${_t(item.txType)}</td><td>${item.ref}</td><td>${item.details}</td><td>${(parseFloat(item.value) || 0).toFixed(2)} EGP</td><td><div class="action-buttons"><button class="primary small btn-approve-financial" data-id="${item.txType === 'po' ? item.poId : item.batchId}" data-type="${item.txType}">${_t('approve')}</button><button class="danger small btn-reject-financial" data-id="${item.txType === 'po' ? item.poId : item.batchId}" data-type="${item.txType}">${_t('reject')}</button></div></td>`;
        tbody.appendChild(tr);
    });
}

function renderTransactionHistory(filters = {}) {
    const table = document.getElementById('table-transaction-history');
    if(!table) return;
    const tbody = table.querySelector('tbody');
    tbody.innerHTML = '';
    let allTx = [...state.transactions], allPo = [...state.purchaseOrders];
    if (!userCan('viewAllBranches')) { const branchCode = state.currentUser.AssignedBranchCode; if (branchCode) { allTx = allTx.filter(t => String(t.branchCode) === branchCode || String(t.fromBranchCode) === branchCode || String(t.toBranchCode) === branchCode); allPo = []; } }
    let allHistoryItems = [ ...allTx, ...allPo.map(po => ({...po, type: 'po', batchId: po.poId, ref: po.poId})) ];
    const sDate = filters.startDate ? new Date(filters.startDate) : null; if(sDate) sDate.setHours(0,0,0,0);
    const eDate = filters.endDate ? new Date(filters.endDate) : null; if(eDate) eDate.setHours(23,59,59,999);
    if (sDate) allHistoryItems = allHistoryItems.filter(t => new Date(t.date) >= sDate);
    if (eDate) allHistoryItems = allHistoryItems.filter(t => new Date(t.date) <= eDate);
    if (filters.type) allHistoryItems = allHistoryItems.filter(t => String(t.type) === String(filters.type));
    if (filters.branch) allHistoryItems = allHistoryItems.filter(t => String(t.branchCode) === String(filters.branch) || String(t.fromBranchCode) === String(filters.branch) || String(t.toBranchCode) === String(filters.branch));
    if (filters.searchTerm) { const lowerFilter = filters.searchTerm.toLowerCase(); allHistoryItems = allHistoryItems.filter(t => { const item = findByKey(state.items, 'code', t.itemCode); return (t.ref && String(t.ref).toLowerCase().includes(lowerFilter)) || (t.batchId && String(t.batchId).toLowerCase().includes(lowerFilter)) || (item && item.name.toLowerCase().includes(lowerFilter)); }); }
    const grouped = {};
    allHistoryItems.forEach(t => { const key = t.batchId; if (!key) return; if (!grouped[key]) grouped[key] = { date: t.date, type: t.type, batchId: key, transactions: [] }; grouped[key].transactions.push(t); });
    Object.values(grouped).sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(group => {
        const first = group.transactions[0];
        let details = '', statusTag = '', refNum = first.ref || first.batchId, typeDisplay = first.type.replace(/_/g, ' ').toUpperCase();
        const canEditInvoice = userCan('opEditInvoice') && first.type === 'receive' && (first.isApproved !== true && String(first.isApproved).toUpperCase() !== 'TRUE');
        let actionsHtml = `<button class="secondary small btn-view-tx" data-batch-id="${group.batchId}" data-type="${first.type}">${_t('view_print')}</button>`;
        if(canEditInvoice) actionsHtml += `<button class="secondary small btn-edit-invoice" data-batch-id="${group.batchId}">${_t('edit')}</button>`;
        switch(first.type) {
            case 'receive': details = `${_t('receive')} from <strong>${findByKey(state.suppliers, 'supplierCode', first.supplierCode)?.name || 'N/A'}</strong>`; refNum = first.invoiceNumber; statusTag = first.isApproved === true || String(first.isApproved).toUpperCase() === 'TRUE' ? `<span class="status-tag status-approved">${_t('status_approved')}</span>` : `<span class="status-tag status-pendingapproval">${_t('status_pending')}</span>`; break;
            case 'return_out': details = `${_t('return')} to <strong>${findByKey(state.suppliers, 'supplierCode', first.supplierCode)?.name || 'N/A'}</strong>`; typeDisplay = _t('return_to_supplier'); break;
            case 'issue': details = `${_t('issue')} to <strong>${findByKey(state.sections, 'sectionCode', first.sectionCode)?.sectionName || 'N/A'}</strong>`; break;
            case 'transfer_out': case 'transfer_in': details = `${_t('transfer')} to <strong>${findByKey(state.branches, 'branchCode', first.toBranchCode)?.branchName || 'N/A'}</strong>`; typeDisplay = _t('transfer'); statusTag = `<span class="status-tag status-${(first.Status || '').toLowerCase().replace(/ /g,'')}">${_t('status_' + (first.Status || '').toLowerCase().replace(/ /g,''))}</span>`; break;
            case 'po': typeDisplay = _t('po'); details = `${_t('create_po')} for <strong>${findByKey(state.suppliers, 'supplierCode', first.supplierCode)?.name || 'N/A'}</strong>`; statusTag = `<span class="status-tag status-${(first.Status || 'pending').toLowerCase().replace(/ /g,'')}">${_t('status_' + (first.Status || 'pending').toLowerCase().replace(/ /g,''))}</span>`; break;
            case 'adjustment_in': case 'adjustment_out': typeDisplay = _t('stock_adjustment'); details = `${_t('adjustments')} at <strong>${findByKey(state.branches, 'branchCode', first.fromBranchCode)?.branchName || 'N/A'}</strong>`; break;
        }
        const tr = document.createElement('tr'); tr.innerHTML = `<td>${new Date(first.date).toLocaleString()}</td><td>${typeDisplay}</td><td>${refNum}</td><td>${details}</td><td>${statusTag}</td><td><div class="action-buttons">${actionsHtml}</div></td>`; tbody.appendChild(tr);
    });
}

function renderActivityLog() {
    const table = document.getElementById('table-activity-log');
    if(!table) return;
    const tbody = table.querySelector('tbody');
    tbody.innerHTML = '';
    if (!state.activityLog || state.activityLog.length === 0) { tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;">No activity logged.</td></tr>`; return; }
    state.activityLog.slice().reverse().forEach(log => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${new Date(log.Timestamp).toLocaleString()}</td><td>${log.User || 'N/A'}</td><td>${log.Action}</td><td>${log.Description}</td>`;
        tbody.appendChild(tr);
    });
}

function renderUserManagementUI() {
    const usersTable = document.getElementById('table-users');
    const rolesTable = document.getElementById('table-roles');
    if(!usersTable || !rolesTable) return;
    
    const usersTbody = usersTable.querySelector('tbody');
    usersTbody.innerHTML = '';
    (state.allUsers || []).forEach(user => {
        const tr = document.createElement('tr');
        const assigned = findByKey(state.branches, 'branchCode', user.AssignedBranchCode)?.branchName || findByKey(state.sections, 'sectionCode', user.AssignedSectionCode)?.sectionName || 'N/A';
        const isDisabled = user.isDisabled === true || String(user.isDisabled).toUpperCase() === 'TRUE';
        tr.innerHTML = `<td>${user.Username}</td><td>${user.Name}</td><td>${user.RoleName}</td><td>${assigned}</td><td><span class="status-tag ${isDisabled ? 'status-rejected' : 'status-approved'}">${isDisabled ? 'Disabled' : 'Active'}</span></td><td><button class="secondary small btn-edit" data-type="user" data-id="${user.Username}">${_t('edit')}</button></td>`;
        usersTbody.appendChild(tr);
    });
    const rolesTbody = rolesTable.querySelector('tbody');
    rolesTbody.innerHTML = '';
    (state.allRoles || []).forEach(role => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${role.RoleName}</td><td><button class="secondary small btn-edit" data-type="role" data-id="${role.RoleName}">${_t('edit')}</button></td>`;
        rolesTbody.appendChild(tr);
    });
}

function renderMyRequests() {
    const table = document.getElementById('table-my-requests-history');
    if(!table) return;
    const tbody = table.querySelector('tbody');
    tbody.innerHTML = '';
    const myRequests = (state.itemRequests || []).filter(r => r.RequestedBy === state.currentUser.Name);
    const grouped = myRequests.reduce((acc, req) => { if (!acc[req.RequestID]) acc[req.RequestID] = { ...req, items: [] }; acc[req.RequestID].items.push(req); return acc; }, {});
    Object.values(grouped).reverse().forEach(group => {
        const tr = document.createElement('tr');
        const itemsSummary = group.items.map(i => `${i.Quantity} / ${i.IssuedQuantity !== '' && i.IssuedQuantity !== null ? i.IssuedQuantity : 'N/A'}`).join(', ');
        tr.innerHTML = `<td>${group.RequestID}</td><td>${new Date(group.Date).toLocaleDateString()}</td><td>${_t(group.Type)}</td><td>${itemsSummary}</td><td><span class="status-tag status-${group.Status.toLowerCase()}">${_t('status_' + group.Status.toLowerCase())}</span></td><td>${group.StatusNotes || ''}</td>`;
        tbody.appendChild(tr);
    });
}

function renderPendingRequests() {
    const table = document.getElementById('table-pending-requests');
    if(!table) return;
    const tbody = table.querySelector('tbody');
    tbody.innerHTML = '';
    const pending = (state.itemRequests || []).filter(r => r.Status === 'Pending' && (userCan('viewAllBranches') || r.ToBranch === state.currentUser.AssignedBranchCode));
    const grouped = pending.reduce((acc, req) => { if (!acc[req.RequestID]) acc[req.RequestID] = []; acc[req.RequestID].push(req); return acc; }, {});
    Object.values(grouped).forEach(group => {
        const first = group[0];
        const fromSection = findByKey(state.sections, 'sectionCode', first.FromSection)?.sectionName || first.FromSection;
        const toBranch = findByKey(state.branches, 'branchCode', first.ToBranch)?.branchName || first.ToBranch;
        const itemsSummary = group.map(i => `${i.Quantity} x ${findByKey(state.items, 'code', i.ItemCode)?.name || i.ItemCode}`).join('<br>');
        const tr = document.createElement('tr');
        let canApprove = (first.Type === 'issue' && userCan('opApproveIssueRequest')) || (first.Type === 'resupply' && userCan('opApproveResupplyRequest'));
        tr.innerHTML = `<td>${first.RequestID}</td><td>${new Date(first.Date).toLocaleString()}</td><td>${_t(first.Type)}</td><td>${first.RequestedBy}</td><td>${_t('from_branch')}: ${fromSection}<br>${_t('to_branch')}: ${toBranch}</td><td>${itemsSummary}</td><td><div class="action-buttons"><button class="primary small btn-approve-request" data-id="${first.RequestID}" ${!canApprove ? 'disabled' : ''}>Approve</button><button class="danger small btn-reject-request" data-id="${first.RequestID}" ${!canApprove ? 'disabled' : ''}>${_t('reject')}</button></div></td>`;
        tbody.appendChild(tr);
    });
}

function renderSupplierStatement(supplierCode, startDateStr, endDateStr) {
    const resultsContainer = document.getElementById('supplier-statement-results');
    const exportBtn = document.getElementById('btn-export-supplier-statement');
    if(!resultsContainer || !exportBtn) return;
    
    const supplier = findByKey(state.suppliers, 'supplierCode', supplierCode);
    if (!supplier) { exportBtn.disabled = true; return; }
    const financials = calculateSupplierFinancials();
    const supplierData = financials[supplierCode];
    if(!supplierData) { resultsContainer.innerHTML = `<p>No financial data found.</p>`; exportBtn.disabled = true; return; }
    const sDate = startDateStr ? new Date(startDateStr) : null; if(sDate) sDate.setHours(0,0,0,0);
    const eDate = endDateStr ? new Date(endDateStr) : null; if(eDate) eDate.setHours(23, 59, 59, 999);
    let openingBalance = 0;
    if (sDate) { supplierData.events.forEach(event => { if (new Date(event.date) < sDate) openingBalance += (event.debit || 0) - (event.credit || 0); }); }
    const filteredEvents = supplierData.events.filter(event => { const eventDate = new Date(event.date); return (!sDate || eventDate >= sDate) && (!eDate || eventDate <= eDate); });
    let balance = openingBalance; let tableBodyHtml = '';
    if (sDate) tableBodyHtml += `<tr style="background-color: var(--bg-color);"><td colspan="3"><strong>${_t('opening_balance_as_of', {date: sDate.toLocaleDateString()})}</strong></td><td>-</td><td>-</td><td><strong>${openingBalance.toFixed(2)} EGP</strong></td></tr>`;
    filteredEvents.forEach(event => { balance += (event.debit || 0) - (event.credit || 0); tableBodyHtml += `<tr><td>${new Date(event.date).toLocaleDateString()}</td><td>${event.type}</td><td>${event.ref}</td><td>${event.debit > 0 ? event.debit.toFixed(2) : '-'}</td><td>${event.credit > 0 ? event.credit.toFixed(2) : '-'}</td><td>${balance.toFixed(2)} EGP</td></tr>`; });
    resultsContainer.innerHTML =`<div class="printable-document"><div class="printable-header"><h2>${_t('supplier_statement_title', {supplierName: supplier.name})}</h2></div><div class="report-area"><table id="table-supplier-statement-report"><thead><tr><th>${_t('table_h_date')}</th><th>${_t('table_h_type')}</th><th>${_t('reference')}</th><th>${_t('table_h_debit')}</th><th>${_t('table_h_credit')}</th><th>${_t('table_h_balance')}</th></tr></thead><tbody>${tableBodyHtml}</tbody><tfoot><tr style="font-weight:bold; background-color: var(--bg-color);"><td colspan="5" style="text-align:right;">${_t('closing_balance')}</td><td>${balance.toFixed(2)} EGP</td></tr></tfoot></table></div></div>`;
    resultsContainer.style.display = 'block'; exportBtn.disabled = false;
}

function renderUnifiedConsumptionReport() {
    const resultsContainer = document.getElementById('consumption-report-results');
    const exportBtn = document.getElementById('btn-export-consumption-report');
    if(!resultsContainer || !exportBtn) return;
    
    const selectedBranches = Array.from(state.reportSelectedBranches);
    const selectedSections = Array.from(state.reportSelectedSections);
    const selectedItems = Array.from(state.reportSelectedItems);
    const startDate = document.getElementById('consumption-start-date').value;
    const endDate = document.getElementById('consumption-end-date').value;
    let filteredTx = (state.transactions || []).filter(t => t.type === 'issue');
    const sDate = startDate ? new Date(startDate) : null; if(sDate) sDate.setHours(0,0,0,0);
    const eDate = endDate ? new Date(endDate) : null; if(eDate) eDate.setHours(23,59,59,999);
    if(selectedBranches.length > 0) filteredTx = filteredTx.filter(t => selectedBranches.includes(t.fromBranchCode));
    if(selectedSections.length > 0) filteredTx = filteredTx.filter(t => selectedSections.includes(t.sectionCode));
    if(selectedItems.length > 0) filteredTx = filteredTx.filter(t => selectedItems.includes(t.itemCode));
    if(sDate) filteredTx = filteredTx.filter(t => new Date(t.date) >= sDate);
    if(eDate) filteredTx = filteredTx.filter(t => new Date(t.date) <= eDate);
    const reportData = {}; let grandTotalValue = 0;
    filteredTx.forEach(t => {
        const branch = findByKey(state.branches, 'branchCode', t.fromBranchCode);
        const section = findByKey(state.sections, 'sectionCode', t.sectionCode);
        const item = findByKey(state.items, 'code', t.itemCode);
        if (!branch || !section || !item) return;
        const value = (parseFloat(t.quantity) || 0) * (parseFloat(item.cost) || 0); // Using current cost for simplicity
        grandTotalValue += value;
        if (!reportData[branch.branchName]) reportData[branch.branchName] = { totalValue: 0, sections: {} };
        if (!reportData[branch.branchName].sections[section.sectionName]) reportData[branch.branchName].sections[section.sectionName] = { totalValue: 0, items: {} };
        if (!reportData[branch.branchName].sections[section.sectionName].items[item.name]) reportData[branch.branchName].sections[section.sectionName].items[item.name] = { totalValue: 0, totalQty: 0, item: item };
        reportData[branch.branchName].totalValue += value;
        reportData[branch.branchName].sections[section.sectionName].totalValue += value;
        reportData[branch.branchName].sections[section.sectionName].items[item.name].totalValue += value;
        reportData[branch.branchName].sections[section.sectionName].items[item.name].totalQty += parseFloat(t.quantity) || 0;
    });
    let tableHtml = `<table id="table-consumption-report"><thead><tr><th>Name</th><th style="text-align:right;">Total Qty</th><th style="text-align:right;">Total Value</th></tr></thead><tbody>`;
    for (const branchName in reportData) {
        const branchData = reportData[branchName];
        tableHtml += `<tr class="consumption-group-branch"><td>${branchName}</td><td></td><td style="text-align:right;">${branchData.totalValue.toFixed(2)}</td></tr>`;
        for(const sectionName in branchData.sections) {
            const sectionData = branchData.sections[sectionName];
            tableHtml += `<tr class="consumption-group-section"><td>${sectionName}</td><td></td><td style="text-align:right;">${sectionData.totalValue.toFixed(2)}</td></tr>`;
             for(const itemName in sectionData.items) {
                const itemData = sectionData.items[itemName];
                tableHtml += `<tr class="consumption-item-row"><td>${itemName}</td><td style="text-align:right;">${itemData.totalQty.toFixed(2)}</td><td style="text-align:right;">${itemData.totalValue.toFixed(2)}</td></tr>`;
             }
        }
    }
    tableHtml += `</tbody><tfoot><tr style="font-weight:bold; background-color:var(--bg-color);"><td colspan="2" style="text-align:right;">Grand Total</td><td style="text-align:right;">${grandTotalValue.toFixed(2)} EGP</td></tr></tfoot></table>`;
    resultsContainer.innerHTML = `<div class="printable-document">${tableHtml}</div>`;
    resultsContainer.style.display = 'block';
    exportBtn.disabled = false;
}

// --- DOCUMENT GENERATORS ---
const generateReceiveDocument = (data) => { const supplier = findByKey(state.suppliers, 'supplierCode', data.supplierCode) || { name: 'DELETED' }; const branch = findByKey(state.branches, 'branchCode', data.branchCode) || { branchName: 'DELETED' }; let itemsHtml = '', totalValue = 0; data.items.forEach(item => { const itemTotal = item.quantity * item.cost; totalValue += itemTotal; itemsHtml += `<tr><td>${item.itemCode}</td><td>${item.itemName}</td><td>${item.quantity.toFixed(2)}</td><td>${item.cost.toFixed(2)} EGP</td><td>${itemTotal.toFixed(2)} EGP</td></tr>`; }); const content = `<div class="printable-document card" dir="${state.currentLanguage === 'ar' ? 'rtl' : 'ltr'}"><h2>Goods Received Note</h2><p><strong>GRN No:</strong> ${data.batchId}</p><p><strong>${_t('table_h_invoice_no')}:</strong> ${data.invoiceNumber}</p><p><strong>${_t('table_h_date')}:</strong> ${new Date(data.date).toLocaleString()}</p><p><strong>${_t('supplier')}:</strong> ${supplier.name} (${supplier.supplierCode || ''})</p><p><strong>${_t('receive_stock')} at:</strong> ${branch.branchName} (${branch.branchCode || ''})</p><hr><h3>${_t('items_to_be_received')}</h3><table><thead><tr><th>${_t('table_h_code')}</th><th>${_t('item')}</th><th>${_t('table_h_qty')}</th><th>${_t('table_h_cost_per_unit')}</th><th>${_t('table_h_total')}</th></tr></thead><tbody>${itemsHtml}</tbody><tfoot><tr><td colspan="4" style="text-align:right;font-weight:bold;">${_t('total_value')}</td><td style="font-weight:bold;">${totalValue.toFixed(2)} EGP</td></tr></tfoot></table><hr><p><strong>${_t('notes_optional')}:</strong> ${data.notes || 'N/A'}</p><br><p><strong>Signature:</strong> _________________________</p></div>`; printContent(content); };
const generateTransferDocument = (data) => { const fromBranch = findByKey(state.branches, 'branchCode', data.fromBranchCode) || { branchName: 'DELETED' }; const toBranch = findByKey(state.branches, 'branchCode', data.toBranchCode) || { branchName: 'DELETED' }; let itemsHtml = ''; data.items.forEach(item => { const fullItem = findByKey(state.items, 'code', item.itemCode) || { code: 'N/A', name: 'DELETED', unit: 'N/A' }; itemsHtml += `<tr><td>${fullItem.code || item.itemCode}</td><td>${item.itemName || fullItem.name}</td><td>${parseFloat(item.quantity).toFixed(2)}</td><td>${fullItem.unit}</td></tr>`; }); const content = `<div class="printable-document card" dir="${state.currentLanguage === 'ar' ? 'rtl' : 'ltr'}"><h2>${_t('internal_transfer')} Order</h2><p><strong>Order ID:</strong> ${data.batchId}</p><p><strong>${_t('reference')}:</strong> ${data.ref}</p><p><strong>${_t('table_h_date')}:</strong> ${new Date(data.date).toLocaleString()}</p><hr><p><strong>${_t('from_branch')}:</strong> ${fromBranch.branchName} (${fromBranch.branchCode || ''})</p><p><strong>${_t('to_branch')}:</strong> ${toBranch.branchName} (${toBranch.branchCode || ''})</p><hr><h3>${_t('items_to_be_transferred')}</h3><table><thead><tr><th>${_t('table_h_code')}</th><th>${_t('item')}</th><th>${_t('table_h_qty')}</th><th>${_t('table_h_unit')}</th></tr></thead><tbody>${itemsHtml}</tbody></table><hr><p><strong>${_t('notes_optional')}:</strong> ${data.notes || 'N/A'}</p><br><p><strong>Sender:</strong> _________________</p><p><strong>Receiver:</strong> _________________</p></div>`; printContent(content); };
const generateIssueDocument = (data) => { const fromBranch = findByKey(state.branches, 'branchCode', data.fromBranchCode) || { branchName: 'DELETED' }; const toSection = findByKey(state.sections, 'sectionCode', data.sectionCode) || { sectionName: 'DELETED' }; let itemsHtml = ''; data.items.forEach(item => { const fullItem = findByKey(state.items, 'code', item.itemCode) || { name: 'DELETED', unit: 'N/A' }; itemsHtml += `<tr><td>${item.itemCode}</td><td>${item.itemName || fullItem.name}</td><td>${item.quantity.toFixed(2)}</td><td>${fullItem.unit}</td></tr>`; }); const content = `<div class="printable-document card" dir="${state.currentLanguage === 'ar' ? 'rtl' : 'ltr'}"><h2>${_t('issue_stock')} Note</h2><p><strong>${_t('issue_ref_no')}:</strong> ${data.ref}</p><p><strong>Batch ID:</strong> ${data.batchId}</p><p><strong>${_t('table_h_date')}:</strong> ${new Date(data.date).toLocaleString()}</p><hr><p><strong>${_t('from_branch')}:</strong> ${fromBranch.branchName} (${fromBranch.branchCode || ''})</p><p><strong>${_t('to_section')}:</strong> ${toSection.sectionName} (${toSection.sectionCode || ''})</p><hr><h3>${_t('items_to_be_issued')}</h3><table><thead><tr><th>${_t('table_h_code')}</th><th>${_t('item')}</th><th>${_t('table_h_qty')}</th><th>${_t('table_h_unit')}</th></tr></thead><tbody>${itemsHtml}</tbody></table><hr><p><strong>${_t('notes_optional')}:</strong> ${data.notes || 'N/A'}</p><br><p><strong>Issued By:</strong> _________________</p><p><strong>Received By:</strong> _________________</p></div>`; printContent(content); };
const generatePaymentVoucher = (data) => { const supplier = findByKey(state.suppliers, 'supplierCode', data.supplierCode) || { name: 'DELETED' }; let invoicesHtml = ''; data.payments.forEach(p => { invoicesHtml += `<tr><td>${p.invoiceNumber}</td><td>${p.amount.toFixed(2)} EGP</td></tr>`; }); const content = `<div class="printable-document card" dir="${state.currentLanguage === 'ar' ? 'rtl' : 'ltr'}"><h2>Payment Voucher</h2><p><strong>Voucher ID:</strong> ${data.payments[0].paymentId}</p><p><strong>${_t('table_h_date')}:</strong> ${new Date(data.date).toLocaleString()}</p><hr><p><strong>Paid To:</strong> ${supplier.name} (${supplier.supplierCode || ''})</p><p><strong>${_t('table_h_amount')}:</strong> ${data.totalAmount.toFixed(2)} EGP</p><p><strong>Method:</strong> ${data.method}</p><hr><h3>Payment Allocation</h3><table><thead><tr><th>${_t('table_h_invoice_no')}</th><th>${_t('table_h_amount_to_pay')}</th></tr></thead><tbody>${invoicesHtml}</tbody></table><br><p><strong>Signature:</strong> _________________</p></div>`; printContent(content); };
const generatePODocument = (data) => { const supplier = findByKey(state.suppliers, 'supplierCode', data.supplierCode) || { name: 'DELETED' }; let itemsHtml = '', totalValue = 0; data.items.forEach(item => { const itemDetails = findByKey(state.items, 'code', item.itemCode) || {name: "N/A"}; const itemTotal = (parseFloat(item.quantity) || 0) * (parseFloat(item.cost) || 0); totalValue += itemTotal; itemsHtml += `<tr><td>${item.itemCode}</td><td>${itemDetails.name}</td><td>${(parseFloat(item.quantity) || 0).toFixed(2)}</td><td>${(parseFloat(item.cost) || 0).toFixed(2)} EGP</td><td>${itemTotal.toFixed(2)} EGP</td></tr>`; }); const content = `<div class="printable-document card" dir="${state.currentLanguage === 'ar' ? 'rtl' : 'ltr'}"><h2>${_t('po')}</h2><p><strong>${_t('table_h_po_no')}:</strong> ${data.poId || data.batchId}</p><p><strong>${_t('table_h_date')}:</strong> ${new Date(data.date).toLocaleString()}</p><p><strong>${_t('supplier')}:</strong> ${supplier.name} (${supplier.supplierCode || ''})</p><hr><h3>${_t('items_to_order')}</h3><table><thead><tr><th>${_t('table_h_code')}</th><th>${_t('item')}</th><th>${_t('table_h_qty')}</th><th>${_t('table_h_cost_per_unit')}</th><th>${_t('table_h_total')}</th></tr></thead><tbody>${itemsHtml}</tbody><tfoot><tr><td colspan="4" style="text-align:right;font-weight:bold;">${_t('total_value')}</td><td style="font-weight:bold;">${totalValue.toFixed(2)} EGP</td></tr></tfoot></table><hr><p><strong>${_t('notes_optional')}:</strong> ${data.notes || 'N/A'}</p><br><p><strong>Authorized By:</strong> ${data.createdBy || state.currentUser.Name}</p></div>`; printContent(content); };
const generateReturnDocument = (data) => { const supplier = findByKey(state.suppliers, 'supplierCode', data.supplierCode) || { name: 'DELETED' }; const branch = findByKey(state.branches, 'branchCode', data.fromBranchCode) || { branchName: 'DELETED' }; let itemsHtml = '', totalValue = 0; data.items.forEach(item => { const itemTotal = item.quantity * item.cost; totalValue += itemTotal; itemsHtml += `<tr><td>${item.itemCode}</td><td>${item.itemName}</td><td>${item.quantity.toFixed(2)}</td><td>${item.cost.toFixed(2)} EGP</td><td>${itemTotal.toFixed(2)} EGP</td></tr>`; }); const content = `<div class="printable-document card" dir="${state.currentLanguage === 'ar' ? 'rtl' : 'ltr'}"><h2>${_t('return_to_supplier')} Note</h2><p><strong>${_t('credit_note_ref')}:</strong> ${data.ref}</p><p><strong>${_t('table_h_date')}:</strong> ${new Date(data.date).toLocaleString()}</p><p><strong>Returned To:</strong> ${supplier.name}</p><p><strong>Returned From:</strong> ${branch.branchName}</p><hr><h3>${_t('items_to_return')}</h3><table><thead><tr><th>${_t('table_h_code')}</th><th>${_t('item')}</th><th>${_t('table_h_qty')}</th><th>${_t('table_h_cost_per_unit')}</th><th>${_t('table_h_total')}</th></tr></thead><tbody>${itemsHtml}</tbody><tfoot><tr><td colspan="4" style="text-align:right;font-weight:bold;">${_t('total_value')}</td><td style="font-weight:bold;">${totalValue.toFixed(2)} EGP</td></tr></tfoot></table><hr><p><strong>Reason:</strong> ${data.notes || 'N/A'}</p></div>`; printContent(content); };
const generateRequestIssueDocument = (data) => { const fromBranch = findByKey(state.branches, 'branchCode', data.fromBranchCode) || { branchName: 'DELETED' }; const toSection = findByKey(state.sections, 'sectionCode', data.sectionCode) || { sectionName: 'DELETED' }; let itemsHtml = ''; data.items.forEach(item => { const fullItem = findByKey(state.items, 'code', item.itemCode) || { name: 'DELETED', unit: 'N/A' }; itemsHtml += `<tr><td>${item.itemCode}</td><td>${item.itemName || fullItem.name}</td><td>${(item.quantity || 0).toFixed(2)}</td><td>${fullItem.unit}</td></tr>`; }); const content = `<div class="printable-document card" dir="${state.currentLanguage === 'ar' ? 'rtl' : 'ltr'}"><h2>DRAFT ${_t('issue_stock')} Note (from Request)</h2><p><strong>${_t('table_h_req_id')}:</strong> ${data.ref}</p><p><strong>${_t('table_h_date')}:</strong> ${new Date(data.date).toLocaleString()}</p><hr><p><strong>${_t('from_branch')}:</strong> ${fromBranch.branchName} (${fromBranch.branchCode || ''})</p><p><strong>${_t('to_section')}:</strong> ${toSection.sectionName} (${toSection.sectionCode || ''})</p><hr><h3>${_t('items_to_be_issued')}</h3><table><thead><tr><th>${_t('table_h_code')}</th><th>${_t('item')}</th><th>${_t('table_h_qty')}</th><th>${_t('table_h_unit')}</th></tr></thead><tbody>${itemsHtml}</tbody></table><hr><p><strong>${_t('notes_optional')}:</strong> ${data.notes || 'N/A'}</p><br><p><strong>Issued By:</strong> _________________</p><p><strong>Received By:</strong> _________________</p></div>`; printContent(content); };
