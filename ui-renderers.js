// ui-renderers.js

// --- HELPER FUNCTIONS ---
function getVisibleBranchesForCurrentUser() {
    if (!state.currentUser) return [];
    if (userCan('viewAllBranches')) { return state.branches; }
    if (state.currentUser.AssignedBranchCode) { return state.branches.filter(b => String(b.branchCode) === String(state.currentUser.AssignedBranchCode)); }
    return [];
}

function renderPaginationControls(tableId, totalItems) {
    const settings = state.pagination[tableId];
    if (!settings) return '';

    const totalPages = Math.ceil(totalItems / settings.pageSize);
    if (totalPages <= 1) return '';

    return `
        <button class="pagination-btn" data-table="${tableId}" data-delta="-1" ${settings.page === 1 ? 'disabled' : ''}>Previous</button>
        <span>Page ${settings.page} of ${totalPages}</span>
        <button class="pagination-btn" data-table="${tableId}" data-delta="1" ${settings.page === totalPages ? 'disabled' : ''}>Next</button>
    `;
}

// Helper to safely update table HTML and wrap in scroll container
function updateTableHTML(tableId, html, paginationHtml = '') {
    const tableElement = document.getElementById(tableId);
    if (!tableElement) return;
    
    // Check if parent is already .table-responsive, if not, wrap it
    if (!tableElement.parentElement.classList.contains('table-responsive')) {
        const wrapper = document.createElement('div');
        wrapper.className = 'table-responsive';
        tableElement.parentNode.insertBefore(wrapper, tableElement);
        wrapper.appendChild(tableElement);
    }
    
    const tbody = tableElement.querySelector('tbody');
    if(tbody) tbody.innerHTML = html;

    // Handle Pagination Container
    const parent = tableElement.parentElement.parentElement; // .report-area or .card
    let pagContainer = document.getElementById(`pagination-${tableId.replace('table-', '')}`);
    
    // If specific container exists (defined in HTML), use it
    if (pagContainer) {
        pagContainer.innerHTML = paginationHtml;
    } 
}

// --- NEW: Render Company Info Preview ---
function renderCompanyInfoPreview() {
    const container = document.getElementById('company-preview-container');
    if(!container) return;
    
    const settings = state.companySettings || {};
    
    if (Object.keys(settings).length === 0) {
        container.innerHTML = `<div class="card"><p style="color:var(--text-secondary);">No company details found. Please update in Company Settings.</p></div>`;
        return;
    }
    
    container.innerHTML = `
        <div class="card">
            <h2 style="margin-bottom: 16px;">Company Details Preview</h2>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; font-size: 14px; color: var(--text-main);">
                <div><span style="color: var(--text-secondary); font-size: 12px; font-weight: 600;">Name</span><br><strong>${settings.CompanyName || '-'}</strong></div>
                <div><span style="color: var(--text-secondary); font-size: 12px; font-weight: 600;">Phone</span><br><strong>${settings.Phone || '-'}</strong></div>
                <div><span style="color: var(--text-secondary); font-size: 12px; font-weight: 600;">Email</span><br><strong>${settings.Email || '-'}</strong></div>
                <div><span style="color: var(--text-secondary); font-size: 12px; font-weight: 600;">Tax ID</span><br><strong>${settings.TaxID || '-'}</strong></div>
                <div style="grid-column: 1 / -1;"><span style="color: var(--text-secondary); font-size: 12px; font-weight: 600;">Address</span><br><strong>${settings.Address || '-'}</strong></div>
            </div>
        </div>
    `;
}

// --- TABLE RENDERERS ---
function renderItemsTable(data = state.items) {
    // Client-side Pagination Logic
    const settings = state.pagination['table-items'];
    const totalItems = data.length;
    const start = (settings.page - 1) * settings.pageSize;
    const paginatedData = data.slice(start, start + settings.pageSize);

    let html = '';
    if (totalItems === 0) {
        html = `<tr><td colspan="6" style="text-align:center;">${_t('no_items_found')}</td></tr>`;
    } else {
        const canEdit = userCan('editItem');
        paginatedData.forEach(item => {
            html += `<tr><td>${item.code}</td><td>${item.name}</td><td>${_t(item.category?.toLowerCase()) || item.category || 'N/A'}</td><td>${item.unit}</td><td>${(parseFloat(item.cost) || 0).toFixed(2)} EGP</td><td><div class="action-buttons"><button class="secondary small btn-edit" data-type="item" data-id="${item.code}" ${!canEdit ? 'disabled' : ''}>${_t('edit')}</button><button class="secondary small btn-history" data-type="item" data-id="${item.code}">${_t('history')}</button></div></td></tr>`;
        });
    }
    updateTableHTML('table-items', html, renderPaginationControls('table-items', totalItems));
}

function renderSuppliersTable(data = state.suppliers) {
    const settings = state.pagination['table-suppliers'];
    const totalItems = data.length;
    const start = (settings.page - 1) * settings.pageSize;
    const paginatedData = data.slice(start, start + settings.pageSize);

    let html = '';
    if (totalItems === 0) {
        html = `<tr><td colspan="5" style="text-align:center;">${_t('no_suppliers_found')}</td></tr>`;
    } else {
        const financials = calculateSupplierFinancials();
        const canEdit = userCan('editSupplier');
        paginatedData.forEach(supplier => {
            const balance = financials[supplier.supplierCode]?.balance || 0;
            html += `<tr><td>${supplier.supplierCode || ''}</td><td>${supplier.name}</td><td>${supplier.contact}</td><td>${balance.toFixed(2)} EGP</td><td>${canEdit ? `<button class="secondary small btn-edit" data-type="supplier" data-id="${supplier.supplierCode}">${_t('edit')}</button>`: 'N/A'}</td></tr>`;
        });
    }
    updateTableHTML('table-suppliers', html, renderPaginationControls('table-suppliers', totalItems));
}

function renderBranchesTable(data = state.branches) {
    let html = '';
    if (!data || data.length === 0) {
        html = `<tr><td colspan="3" style="text-align:center;">${_t('no_branches_found')}</td></tr>`;
    } else {
        const canEdit = userCan('editBranch');
        data.forEach(branch => {
            html += `<tr><td>${branch.branchCode || ''}</td><td>${branch.branchName}</td><td>${canEdit ? `<button class="secondary small btn-edit" data-type="branch" data-id="${branch.branchCode}">${_t('edit')}</button>`: 'N/A'}</td></tr>`;
        });
    }
    updateTableHTML('table-branches', html);
}

function renderSectionsTable(data = state.sections) {
    let html = '';
    if (!data || data.length === 0) {
        html = `<tr><td colspan="3" style="text-align:center;">${_t('no_sections_found')}</td></tr>`;
    } else {
        const canEdit = userCan('editSection');
        data.forEach(section => {
            html += `<tr><td>${section.sectionCode || ''}</td><td>${section.sectionName}</td><td>${canEdit ? `<button class="secondary small btn-edit" data-type="section" data-id="${section.sectionCode}">${_t('edit')}</button>`: 'N/A'}</td></tr>`;
        });
    }
    updateTableHTML('table-sections', html);
}

const renderDynamicListTable = (tbodyId, list, columnsConfig, emptyMessage, totalizerFn) => {
    const table = document.getElementById(tbodyId);
    if (!table) return;
    
    // Ensure wrapper
    if (!table.parentElement.classList.contains('table-responsive')) {
        const wrapper = document.createElement('div');
        wrapper.className = 'table-responsive';
        table.parentNode.insertBefore(wrapper, table);
        wrapper.appendChild(table);
    }

    const tbody = table.querySelector('tbody');
    let html = '';
    
    if (!list || list.length === 0) {
        html = `<tr><td colspan="${columnsConfig.length + 1}" style="text-align:center;">${_t(emptyMessage)}</td></tr>`;
    } else {
        const stock = calculateStockLevels();
        list.forEach((item, index) => {
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
            html += `<tr>${cellsHtml}<td><button class="danger small" data-index="${index}">X</button></td></tr>`;
        });
    }
    
    tbody.innerHTML = html;
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
    
    if (!table.parentElement.classList.contains('table-responsive')) {
        const wrapper = document.createElement('div');
        wrapper.className = 'table-responsive';
        table.parentNode.insertBefore(wrapper, table);
        wrapper.appendChild(table);
    }
    
    const tbody = table.querySelector('tbody');
    let html = '';
    if (!state.currentAdjustmentList || state.currentAdjustmentList.length === 0) {
        html = `<tr><td colspan="6" style="text-align:center;">${_t('no_items_for_adjustment')}</td></tr>`;
    } else {
        const stock = calculateStockLevels();
        const branchCodeEl = document.getElementById('adjustment-branch');
        const branchCode = branchCodeEl ? branchCodeEl.value : null;

        state.currentAdjustmentList.forEach((item, index) => {
            const systemQty = (branchCode && stock[branchCode]?.[item.itemCode]?.quantity) || 0;
            const physicalCount = typeof item.physicalCount !== 'undefined' ? item.physicalCount : '';
            const adjustment = physicalCount - systemQty;
            item.physicalCount = physicalCount;
            
            html += `<tr><td>${item.itemCode}</td><td>${item.itemName}</td><td>${systemQty.toFixed(2)}</td><td><input type="number" class="table-input" value="${physicalCount}" min="0" step="0.01" data-index="${index}" data-field="physicalCount"></td><td style="font-weight: bold; color: ${adjustment > 0 ? 'var(--secondary-color)' : (adjustment < 0 ? 'var(--danger-color)' : 'inherit')}">${adjustment.toFixed(2)}</td><td><button class="danger small" data-index="${index}">X</button></td></tr>`;
        });
    }
    tbody.innerHTML = html;
}

function renderStockAdjustmentReport() {
    const table = document.getElementById('table-stock-adj-report');
    if(!table) return;
    
    // Filter transactions for adjustments
    const adjData = state.transactions.filter(t => t.type === 'adjustment_in' || t.type === 'adjustment_out' || t.type === 'stock_adjustment').reverse();
    
    const settings = state.pagination['table-stock-adj-report'];
    const totalItems = adjData.length;
    const start = (settings.page - 1) * settings.pageSize;
    const paginatedData = adjData.slice(start, start + settings.pageSize);

    let html = '';
    paginatedData.forEach(t => {
        const item = findByKey(state.items, 'code', t.itemCode);
        const branch = findByKey(state.branches, 'branchCode', t.fromBranchCode);
        const typeDisplay = t.type === 'adjustment_in' ? 'Increase (+)' : 'Decrease (-)';
        html += `<tr><td>${new Date(t.date).toLocaleDateString()}</td><td>${t.ref || t.batchId}</td><td>${branch?.branchName || t.fromBranchCode}</td><td>${item?.name || t.itemCode}</td><td>${parseFloat(t.quantity).toFixed(2)}</td><td>${typeDisplay}</td><td>${t.notes || ''}</td><td><button class="secondary small btn-view-tx" data-batch-id="${t.batchId}" data-type="adjustment">${_t('view_print')}</button></td></tr>`;
    });
    updateTableHTML('table-stock-adj-report', html, renderPaginationControls('table-stock-adj-report', totalItems));
}

function renderSupplierAdjustmentReport() {
    const table = document.getElementById('table-supplier-adj-report');
    if(!table) return;
    
    const adjData = state.payments.filter(p => p.method === 'OPENING BALANCE').reverse();
    
    const settings = state.pagination['table-supplier-adj-report'];
    const totalItems = adjData.length;
    const start = (settings.page - 1) * settings.pageSize;
    const paginatedData = adjData.slice(start, start + settings.pageSize);

    let html = '';
    paginatedData.forEach(p => {
        const supplier = findByKey(state.suppliers, 'supplierCode', p.supplierCode);
        html += `<tr><td>${new Date(p.date).toLocaleDateString()}</td><td>${p.invoiceNumber}</td><td>${supplier?.name || p.supplierCode}</td><td>${parseFloat(p.amount).toFixed(2)}</td><td>${p.method}</td><td><button class="secondary small btn-print-supplier-adj" data-id="${p.paymentId || p.ref}">Print</button></td></tr>`;
    });
    updateTableHTML('table-supplier-adj-report', html, renderPaginationControls('table-supplier-adj-report', totalItems));
}

function renderItemCentricStockView(itemsToRender = state.items, overrideBranches = null) {
    const container = document.getElementById('item-centric-stock-container');
    if (!container) return;
    const stockByBranch = calculateStockLevels();
    
    // Use override if provided (from filter modal), otherwise use visible branches
    const branchesToDisplay = overrideBranches || getVisibleBranchesForCurrentUser();
    
    let tableHTML = `<div class="table-responsive"><table><thead><tr><th>${_t('table_h_code')}</th><th>${_t('table_h_name')}</th>`;
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
    tableHTML += `</tbody></table></div>`;
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
    // Filter items first
    const filteredItems = state.items.filter(i => i.name.toLowerCase().includes(searchTerm) || i.code.toLowerCase().includes(searchTerm));
    let html = '';
    const branchesToDisplay = getVisibleBranchesForCurrentUser();
    
    // Only show top 10 results to prevent lag
    filteredItems.slice(0, 10).forEach(item => {
        html += `<h4>${item.name} (${item.code})</h4><div class="table-responsive"><table><thead><tr><th>${_t('branch')}</th><th>${_t('table_h_qty')}</th><th>${_t('table_h_value')}</th></tr></thead><tbody>`;
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
        html += `</tbody></table></div><hr>`;
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

    if (!table.parentElement.classList.contains('table-responsive')) {
        const wrapper = document.createElement('div');
        wrapper.className = 'table-responsive';
        table.parentNode.insertBefore(wrapper, table);
        wrapper.appendChild(table);
    }
    
    const tableBody = table.querySelector('tbody');
    let html = '';
    let total = 0;
    
    if (state.invoiceModalSelections.size === 0) { container.style.display = 'none'; return; }
    
    state.invoiceModalSelections.forEach(invNum => {
        const invoice = supplierInvoices[invNum];
        if (!invoice) return;
        const balance = invoice.balance;
        total += balance;
        html += `<tr><td>${invoice.number}</td><td>${balance.toFixed(2)} EGP</td><td><input type="number" class="table-input payment-amount-input" data-invoice="${invoice.number}" value="${balance.toFixed(2)}" step="0.01" min="0" max="${balance.toFixed(2)}" style="max-width: 150px;"></td></tr>`;
    });
    tableBody.innerHTML = html;
    const totalEl = document.getElementById('payment-total-amount');
    if(totalEl) totalEl.textContent = `${total.toFixed(2)} EGP`;
    container.style.display = 'block';
}

function renderPendingTransfers() {
    const container = document.getElementById('pending-transfers-card');
    const table = document.getElementById('table-pending-transfers');
    
    if(!container || !table) return;
    
    // Ensure responsive wrapper
    if (!table.parentElement.classList.contains('table-responsive')) {
        const wrapper = document.createElement('div');
        wrapper.className = 'table-responsive';
        table.parentNode.insertBefore(wrapper, table);
        wrapper.appendChild(table);
    }

    const tbody = table.querySelector('tbody');
    let html = '';
    
    // Group by Batch ID
    const groupedTransfers = {};
    (state.transactions || []).filter(t => t.type === 'transfer_out' && t.Status === 'In Transit').forEach(t => {
        if (!groupedTransfers[t.batchId]) groupedTransfers[t.batchId] = { ...t, items: [], totalQty: 0 };
        groupedTransfers[t.batchId].items.push(t);
        groupedTransfers[t.batchId].totalQty += (parseFloat(t.quantity) || 0);
    });
    
    // Filter by visibility (admin or receiving branch)
    const visibleTransfers = Object.values(groupedTransfers).filter(t => {
        if (userCan('viewAllBranches')) return true;
        return String(t.toBranchCode) === String(state.currentUser.AssignedBranchCode);
    });
    
    if (visibleTransfers.length === 0) {
        container.style.display = 'none';
        return;
    }
    
    // Render Rows
    visibleTransfers.forEach(t => {
        const fromBranch = findByKey(state.branches, 'branchCode', t.fromBranchCode)?.branchName || t.fromBranchCode;
        // Format date to include time
        const dateTime = new Date(t.date).toLocaleString([], { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
        
        // Updated Columns: Date/Time | From Branch | Ref | Quantity | Actions
        html += `<tr>
            <td>${dateTime}</td>
            <td>${fromBranch}</td>
            <td>${t.ref || t.batchId}</td>
            <td style="font-weight:bold;">${t.totalQty.toFixed(2)}</td>
            <td><button class="primary small btn-receive-transfer" data-batch-id="${t.batchId}">${_t('view_confirm')}</button></td>
        </tr>`;
    });
    
    // Update Header to match columns
    const thead = table.querySelector('thead tr');
    if(thead) {
        thead.innerHTML = `
            <th>Date & Time</th>
            <th>From Branch</th>
            <th>Reference #</th>
            <th>Total Qty</th>
            <th>Actions</th>
        `;
    }

    tbody.innerHTML = html;
    container.style.display = 'block';
}

function renderInTransitReport() {
    const table = document.getElementById('table-in-transit');
    if(!table) return;
    
    if (!table.parentElement.classList.contains('table-responsive')) {
        const wrapper = document.createElement('div');
        wrapper.className = 'table-responsive';
        table.parentNode.insertBefore(wrapper, table);
        wrapper.appendChild(table);
    }

    const tbody = table.querySelector('tbody');
    let html = '';
    const groupedTransfers = {};
    (state.transactions || []).filter(t => t.type === 'transfer_out').forEach(t => {
        if (!groupedTransfers[t.batchId]) groupedTransfers[t.batchId] = { ...t, items: [] };
        groupedTransfers[t.batchId].items.push(t);
    });
    const visibleTransfers = Object.values(groupedTransfers).filter(t => userCan('viewAllBranches') || t.toBranchCode === state.currentUser.AssignedBranchCode || t.fromBranchCode === state.currentUser.AssignedBranchCode);
    
    visibleTransfers.forEach(t => {
        const fromBranch = findByKey(state.branches, 'branchCode', t.fromBranchCode)?.branchName || t.fromBranchCode;
        const toBranch = findByKey(state.branches, 'branchCode', t.toBranchCode)?.branchName || t.toBranchCode;
        const canManage = (userCan('viewAllBranches') || t.fromBranchCode === state.currentUser.AssignedBranchCode) && t.Status === 'In Transit';
        const actions = canManage ? `<div class="action-buttons"><button class="secondary small btn-edit-transfer" data-batch-id="${t.batchId}">${_t('edit')}</button><button class="danger small btn-cancel-transfer" data-batch-id="${t.batchId}">${_t('cancel')}</button></div>` : 'N/A';
        html += `<tr><td>${new Date(t.date).toLocaleString()}</td><td>${fromBranch}</td><td>${toBranch}</td><td>${t.ref}</td><td>${t.items.length}</td><td><span class="status-tag status-${t.Status.toLowerCase().replace(/ /g,'')}">${_t('status_' + t.Status.toLowerCase().replace(/ /g, ''))}</span></td><td>${actions}</td></tr>`;
    });
    tbody.innerHTML = html;
}

function renderPurchaseOrdersViewer() {
    const table = document.getElementById('table-po-viewer');
    if(!table) return;
    
    const allPOs = (state.purchaseOrders || []).slice().reverse();
    const settings = state.pagination['table-po-viewer'];
    const totalItems = allPOs.length;
    const start = (settings.page - 1) * settings.pageSize;
    const paginatedPOs = allPOs.slice(start, start + settings.pageSize);

    const tbody = table.querySelector('tbody');
    let html = '';
    paginatedPOs.forEach(po => {
        const supplier = findByKey(state.suppliers, 'supplierCode', po.supplierCode);
        const items = (state.purchaseOrderItems || []).filter(item => item.poId === po.poId);
        const canEditPO = po.Status === 'Pending Approval' && userCan('opCreatePO');
        html += `<tr><td>${po.poId}</td><td>${new Date(po.date).toLocaleDateString()}</td><td>${supplier?.name || po.supplierCode}</td><td>${items.length}</td><td>${(parseFloat(po.totalValue) || 0).toFixed(2)} EGP</td><td><span class="status-tag status-${(po.Status || 'pending').toLowerCase().replace(/ /g,'')}">${po.Status}</span></td><td><div class="action-buttons"><button class="secondary small btn-view-tx" data-batch-id="${po.poId}" data-type="po">${_t('view_print')}</button>${canEditPO ? `<button class="secondary small btn-edit-po" data-po-id="${po.poId}">${_t('edit')}</button>` : ''}</div></td></tr>`;
    });
    updateTableHTML('table-po-viewer', html, renderPaginationControls('table-po-viewer', totalItems));
}

function renderPendingFinancials() {
    const table = document.getElementById('table-pending-financial-approval');
    if(!table) return;
    
    const tbody = table.querySelector('tbody');
    let html = '';
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
        html += `<tr><td>${new Date(item.date).toLocaleDateString()}</td><td>${_t(item.txType)}</td><td>${item.ref}</td><td>${item.details}</td><td>${(parseFloat(item.value) || 0).toFixed(2)} EGP</td><td><div class="action-buttons"><button class="primary small btn-approve-financial" data-id="${item.txType === 'po' ? item.poId : item.batchId}" data-type="${item.txType}">${_t('approve')}</button><button class="danger small btn-reject-financial" data-id="${item.txType === 'po' ? item.poId : item.batchId}" data-type="${item.txType}">${_t('reject')}</button></div></td></tr>`;
    });
    tbody.innerHTML = html;
}

function renderTransactionHistory(filters = {}) {
    const table = document.getElementById('table-transaction-history');
    if(!table) return;
    
    const tbody = table.querySelector('tbody');
    let html = '';
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
    
    // Grouping
    const grouped = {};
    allHistoryItems.forEach(t => { const key = t.batchId; if (!key) return; if (!grouped[key]) grouped[key] = { date: t.date, type: t.type, batchId: key, transactions: [] }; grouped[key].transactions.push(t); });
    
    const groupedArray = Object.values(grouped).sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Pagination
    const settings = state.pagination['table-transaction-history'];
    const totalItems = groupedArray.length;
    const start = (settings.page - 1) * settings.pageSize;
    const paginatedGroups = groupedArray.slice(start, start + settings.pageSize);

    paginatedGroups.forEach(group => {
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
        html += `<tr><td>${new Date(first.date).toLocaleString()}</td><td>${typeDisplay}</td><td>${refNum}</td><td>${details}</td><td>${statusTag}</td><td><div class="action-buttons">${actionsHtml}</div></td></tr>`;
    });
    
    updateTableHTML('table-transaction-history', html, renderPaginationControls('table-transaction-history', totalItems));
}

function renderActivityLog() {
    const data = state.activityLog || [];
    const settings = state.pagination['table-activity-log'];
    const totalItems = data.length;
    const start = (settings.page - 1) * settings.pageSize;
    const paginatedData = data.slice().reverse().slice(start, start + settings.pageSize);

    let html = '';
    if (totalItems === 0) { html = `<tr><td colspan="4" style="text-align:center;">No activity logged.</td></tr>`; }
    else {
        paginatedData.forEach(log => {
            html += `<tr><td>${new Date(log.Timestamp).toLocaleString()}</td><td>${log.User || 'N/A'}</td><td>${log.Action}</td><td>${log.Description}</td></tr>`;
        });
    }
    updateTableHTML('table-activity-log', html, renderPaginationControls('table-activity-log', totalItems));
}

function renderUserManagementUI() {
    const usersTable = document.getElementById('table-users');
    const rolesTable = document.getElementById('table-roles');
    
    // RENDER NEW MODULE
    renderCompanyInfoPreview();

    if(!usersTable || !rolesTable) return;
    
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

function renderMyRequests() {
    const table = document.getElementById('table-my-requests-history');
    if(!table) return;

    const myRequests = (state.itemRequests || []).filter(r => r.RequestedBy === state.currentUser.Name);
    const grouped = myRequests.reduce((acc, req) => { if (!acc[req.RequestID]) acc[req.RequestID] = { ...req, items: [] }; acc[req.RequestID].items.push(req); return acc; }, {});
    const groupedArray = Object.values(grouped).reverse();
    
    const settings = state.pagination['table-my-requests-history'];
    const totalItems = groupedArray.length;
    const start = (settings.page - 1) * settings.pageSize;
    const paginatedData = groupedArray.slice(start, start + settings.pageSize);

    let html = '';
    paginatedData.forEach(group => {
        const itemsSummary = group.items.map(i => `${i.Quantity} / ${i.IssuedQuantity !== '' && i.IssuedQuantity !== null ? i.IssuedQuantity : 'N/A'}`).join(', ');
        const branchName = findByKey(state.branches, 'branchCode', group.ToBranch)?.branchName || group.ToBranch;
        const sectionName = findByKey(state.sections, 'sectionCode', group.FromSection)?.sectionName || group.FromSection;
        
        // View/Print Button included in Actions
        html += `<tr><td>${group.RequestID}</td><td>${new Date(group.Date).toLocaleDateString()}</td><td>${_t(group.Type)}</td><td>${itemsSummary}</td><td>${branchName}</td><td>${sectionName}</td><td><span class="status-tag status-${group.Status.toLowerCase()}">${_t('status_' + group.Status.toLowerCase())}</span></td><td><button class="secondary small btn-view-tx" data-batch-id="${group.RequestID}" data-type="issue">${_t('view_print')}</button></td></tr>`;
    });
    
    updateTableHTML('table-my-requests-history', html, renderPaginationControls('table-my-requests-history', totalItems));
}

function renderPendingRequests() {
    const table = document.getElementById('table-pending-requests');
    if(!table) return;
    
    const tbody = table.querySelector('tbody');
    let html = '';
    const pending = (state.itemRequests || []).filter(r => r.Status === 'Pending' && (userCan('viewAllBranches') || r.ToBranch === state.currentUser.AssignedBranchCode));
    const grouped = pending.reduce((acc, req) => { if (!acc[req.RequestID]) acc[req.RequestID] = []; acc[req.RequestID].push(req); return acc; }, {});
    
    Object.values(grouped).forEach(group => {
        const first = group[0];
        const fromSection = findByKey(state.sections, 'sectionCode', first.FromSection)?.sectionName || first.FromSection;
        const toBranch = findByKey(state.branches, 'branchCode', first.ToBranch)?.branchName || first.ToBranch;
        const itemsSummary = group.map(i => `${i.Quantity} x ${findByKey(state.items, 'code', i.ItemCode)?.name || i.ItemCode}`).join('<br>');
        let canApprove = (first.Type === 'issue' && userCan('opApproveIssueRequest')) || (first.Type === 'resupply' && userCan('opApproveResupplyRequest'));
        html += `<tr><td>${first.RequestID}</td><td>${new Date(first.Date).toLocaleString()}</td><td>${_t(first.Type)}</td><td>${first.RequestedBy}</td><td>${_t('from_branch')}: ${fromSection}<br>${_t('to_branch')}: ${toBranch}</td><td>${itemsSummary}</td><td><div class="action-buttons"><button class="primary small btn-approve-request" data-id="${first.RequestID}" ${!canApprove ? 'disabled' : ''}>Approve</button><button class="danger small btn-reject-request" data-id="${first.RequestID}" ${!canApprove ? 'disabled' : ''}>${_t('reject')}</button></div></td></tr>`;
    });
    updateTableHTML('table-pending-requests', html);
}

// Supplier Statement Renderer (moved functionality from app.js click handler to here)
function renderSupplierStatement(supplierCode, startDate, endDate) {
    const container = document.getElementById('supplier-statement-results');
    if(!container) return;
    
    if(!supplierCode) { container.innerHTML = `<p style="color:red;">Please select a supplier.</p>`; container.style.display = 'block'; return; }
    
    const financials = calculateSupplierFinancials();
    const supplierData = financials[supplierCode];
    if (!supplierData) { container.innerHTML = '<p>No data found.</p>'; container.style.display = 'block'; return; }

    let balance = 0;
    let html = `<div class="printable-document card"><h2>${_t('supplier_statement_title', {supplierName: supplierData.supplierName})}</h2><p>${_t('date_generated')} ${new Date().toLocaleDateString()}</p>`;
    
    const sDate = startDate ? new Date(startDate) : null;
    const eDate = endDate ? new Date(endDate) : null;
    let filteredEvents = supplierData.events;
    
    if (sDate) {
        // Calculate Opening Balance
        const previousEvents = filteredEvents.filter(e => new Date(e.date) < sDate);
        previousEvents.forEach(e => balance += (e.debit - e.credit));
        html += `<p>${_t('opening_balance_as_of', {date: sDate.toLocaleDateString()})}: <strong>${balance.toFixed(2)} EGP</strong></p>`;
        filteredEvents = filteredEvents.filter(e => new Date(e.date) >= sDate);
    }
    if (eDate) {
        eDate.setHours(23,59,59);
        filteredEvents = filteredEvents.filter(e => new Date(e.date) <= eDate);
    }

    html += `<table><thead><tr><th>Date</th><th>Type</th><th>Ref</th><th>Debit</th><th>Credit</th><th>Balance</th></tr></thead><tbody>`;
    
    filteredEvents.forEach(e => {
        balance += (e.debit - e.credit);
        html += `<tr><td>${new Date(e.date).toLocaleDateString()}</td><td>${e.type}</td><td>${e.ref}</td><td>${e.debit > 0 ? e.debit.toFixed(2) : '-'}</td><td>${e.credit > 0 ? e.credit.toFixed(2) : '-'}</td><td>${balance.toFixed(2)}</td></tr>`;
    });
    
    html += `</tbody><tfoot><tr><td colspan="5" style="text-align:right;"><strong>${_t('closing_balance')}</strong></td><td><strong>${balance.toFixed(2)} EGP</strong></td></tr></tfoot></table></div>`;
    
    container.innerHTML = html;
    container.style.display = 'block';
    const btnExport = document.getElementById('btn-export-supplier-statement');
    if(btnExport) btnExport.disabled = false;
}

// Unified Consumption Report
function renderUnifiedConsumptionReport() {
    const container = document.getElementById('consumption-report-results');
    if(!container) return;

    const sDate = document.getElementById('consumption-start-date').value ? new Date(document.getElementById('consumption-start-date').value) : null;
    const eDate = document.getElementById('consumption-end-date').value ? new Date(document.getElementById('consumption-end-date').value) : null;
    if(eDate) eDate.setHours(23,59,59);

    const selBranches = state.reportSelectedBranches.size > 0 ? state.reportSelectedBranches : new Set(state.branches.map(b => b.branchCode));
    const selSections = state.reportSelectedSections.size > 0 ? state.reportSelectedSections : new Set(state.sections.map(s => s.sectionCode));
    const selItems = state.reportSelectedItems; // If empty, all items

    let html = `<div class="printable-document card"><h2>${_t('consumption_report')}</h2>`;
    if(sDate && eDate) html += `<p>${_t('report_period_from_to', {startDate: sDate.toLocaleDateString(), endDate: eDate.toLocaleDateString()})}</p>`;
    else html += `<p>${_t('report_period_all_time')}</p>`;

    // Grouping
    const data = {}; // Key: ItemCode, Value: { qty: 0, cost: 0 }
    
    (state.transactions || []).forEach(t => {
        if (!['issue', 'transfer_out'].includes(t.type)) return;
        
        // Filters
        const date = new Date(t.date);
        if (sDate && date < sDate) return;
        if (eDate && date > eDate) return;
        if (t.type === 'issue' && !selSections.has(t.sectionCode)) return;
        if (t.type === 'transfer_out' && !selBranches.has(t.fromBranchCode)) return; // Outgoing from selected branch is consumption
        if (selItems.size > 0 && !selItems.has(t.itemCode)) return;

        if (!data[t.itemCode]) data[t.itemCode] = { qty: 0, val: 0 };
        const cost = findByKey(state.items, 'code', t.itemCode)?.cost || 0;
        data[t.itemCode].qty += parseFloat(t.quantity);
        data[t.itemCode].val += parseFloat(t.quantity) * cost;
    });

    html += `<table><thead><tr><th>Code</th><th>Item</th><th>${_t('table_h_total_qty_consumed')}</th><th>${_t('table_h_total_value_consumed')}</th></tr></thead><tbody>`;
    let totalVal = 0;
    Object.keys(data).forEach(code => {
        const item = findByKey(state.items, 'code', code);
        html += `<tr><td>${code}</td><td>${item ? item.name : code}</td><td>${data[code].qty.toFixed(2)}</td><td>${data[code].val.toFixed(2)} EGP</td></tr>`;
        totalVal += data[code].val;
    });
    html += `</tbody><tfoot><tr><td colspan="3" style="text-align:right;"><strong>${_t('grand_total_value')}</strong></td><td><strong>${totalVal.toFixed(2)} EGP</strong></td></tr></tfoot></table></div>`;

    container.innerHTML = html;
    container.style.display = 'block';
    const btnExport = document.getElementById('btn-export-consumption-report');
    if(btnExport) btnExport.disabled = false;
}

// --- MODERN DOCUMENT GENERATORS ---

// Helper to build the common header structure
const getDocumentHeader = (title, id, status = '') => {
    // Ensure object exists
    const info = state.companySettings || {}; 
    
    const companyName = info.CompanyName || 'PACKING STOCK';
    const address = info.Address || '';
    // Build strings only if data exists
    const taxInfo = [
        info.TaxID ? `Tax ID: ${info.TaxID}` : '',
        info.CRNumber ? `CR: ${info.CRNumber}` : ''
    ].filter(Boolean).join(' | ');
    
    const contactInfo = [
        info.Phone || '', 
        info.Email || ''
    ].filter(Boolean).join(' - ');

    return `
    <div class="doc-header">
        <div class="doc-brand">
            <h1 style="margin:0; font-size:24px; color:#333;">${companyName}</h1>
            <p style="margin:2px 0; font-size:12px;">${address}</p>
            <p style="margin:2px 0; font-size:12px;">${taxInfo}</p>
            <p style="margin:2px 0; font-size:12px;">${contactInfo}</p>
        </div>
        <div class="doc-title" style="text-align:right;">
            <h2 style="margin:0; font-size:20px;">${title}</h2>
            <div class="status" style="font-size:14px; margin-top:5px;">${status || id}</div>
        </div>
    </div>`;
};

const generateReceiveDocument = (data) => {
    const supplier = findByKey(state.suppliers, 'supplierCode', data.supplierCode) || { name: 'Unknown', contact: '' };
    const branch = findByKey(state.branches, 'branchCode', data.branchCode) || { branchName: 'Unknown' };
    
    let itemsHtml = '', totalValue = 0;
    
    // Handle items
    const items = data.items || [data];
    
    items.forEach(item => {
        const itemTotal = item.quantity * item.cost;
        totalValue += itemTotal;
        itemsHtml += `<tr>
            <td>${item.itemCode}</td>
            <td>${item.itemName}</td>
            <td style="text-align:center">${item.quantity.toFixed(2)}</td>
            <td style="text-align:right">${item.cost.toFixed(2)}</td>
            <td style="text-align:right">${itemTotal.toFixed(2)}</td>
        </tr>`;
    });

    const content = `
    <div class="printable-document">
        ${getDocumentHeader('Goods Received Note', data.batchId, 'RECEIVED')}
        
        <div class="doc-info-grid">
            <div class="info-col">
                <span class="info-label">From Supplier</span>
                <div class="info-value">
                    <strong>${supplier.name}</strong><br>
                    ${supplier.contact || ''}<br>
                    ID: ${supplier.supplierCode || data.supplierCode}
                </div>
            </div>
            <div class="info-col">
                <span class="info-label">Received At</span>
                <div class="info-value">
                    <strong>${branch.branchName}</strong><br>
                    Branch ID: ${branch.branchCode || data.branchCode}
                </div>
            </div>
            <div class="info-col" style="flex: 0 0 200px;">
                <table class="meta-table">
                    <tr><td class="label">Date:</td><td class="val">${new Date(data.date).toLocaleDateString()}</td></tr>
                    <tr><td class="label">Invoice #:</td><td class="val">${data.invoiceNumber}</td></tr>
                    <tr><td class="label">PO Ref:</td><td class="val">${data.poId || 'N/A'}</td></tr>
                </table>
            </div>
        </div>

        <div class="doc-table-container">
            <table class="doc-table">
                <thead>
                    <tr><th>Code</th><th>Item Description</th><th style="text-align:center">Qty</th><th style="text-align:right">Unit Cost</th><th style="text-align:right">Total</th></tr>
                </thead>
                <tbody>${itemsHtml}</tbody>
            </table>
        </div>

        <div class="doc-totals">
            <div class="totals-box">
                <div class="total-row final">
                    <span>Total Value:</span>
                    <span>${totalValue.toFixed(2)} EGP</span>
                </div>
            </div>
        </div>

        ${data.notes ? `<div class="doc-notes"><strong>Notes:</strong> ${data.notes}</div>` : ''}

        <div class="doc-signatures">
            <div class="signature-box">Received By</div>
            <div class="signature-box">Authorized Signature</div>
        </div>
    </div>`;
    printContent(content);
};

const generateTransferDocument = (data) => {
    const fromBranch = findByKey(state.branches, 'branchCode', data.fromBranchCode) || { branchName: 'Unknown' };
    const toBranch = findByKey(state.branches, 'branchCode', data.toBranchCode) || { branchName: 'Unknown' };
    
    // Handle both single item object or array of items
    const items = data.items || [data]; 
    let itemsHtml = '';
    
    items.forEach(item => {
        const fullItem = findByKey(state.items, 'code', item.itemCode) || { name: 'Unknown', unit: 'Units' };
        itemsHtml += `<tr>
            <td>${item.itemCode}</td>
            <td>${item.itemName || fullItem.name}</td>
            <td style="text-align:center">${parseFloat(item.quantity).toFixed(2)}</td>
            <td style="text-align:center">${fullItem.unit || ''}</td>
        </tr>`;
    });

    const content = `
    <div class="printable-document">
        ${getDocumentHeader('Internal Transfer Note', data.batchId, data.Status || 'TRANSFER')}
        
        <div class="doc-info-grid">
            <div class="info-col">
                <span class="info-label">From (Source)</span>
                <div class="info-value">
                    <strong>${fromBranch.branchName}</strong><br>
                    ID: ${data.fromBranchCode}
                </div>
            </div>
            <div class="info-col">
                <span class="info-label">To (Destination)</span>
                <div class="info-value">
                    <strong>${toBranch.branchName}</strong><br>
                    ID: ${data.toBranchCode}
                </div>
            </div>
            <div class="info-col" style="flex: 0 0 200px;">
                <table class="meta-table">
                    <tr><td class="label">Date:</td><td class="val">${new Date(data.date).toLocaleString()}</td></tr>
                    <tr><td class="label">Ref #:</td><td class="val">${data.ref || data.batchId}</td></tr>
                </table>
            </div>
        </div>

        <div class="doc-table-container">
            <table class="doc-table">
                <thead><tr><th>Code</th><th>Item Description</th><th style="text-align:center">Quantity</th><th style="text-align:center">Unit</th></tr></thead>
                <tbody>${itemsHtml}</tbody>
            </table>
        </div>

        ${data.notes ? `<div class="doc-notes"><strong>Notes:</strong> ${data.notes}</div>` : ''}

        <div class="doc-signatures">
            <div class="signature-box">Sent By</div>
            <div class="signature-box">Received By</div>
        </div>
    </div>`;
    printContent(content);
};

const generateIssueDocument = (data) => {
    const fromBranch = findByKey(state.branches, 'branchCode', data.fromBranchCode) || { branchName: 'Unknown' };
    const toSection = findByKey(state.sections, 'sectionCode', data.sectionCode) || { sectionName: 'Unknown' };
    
    // Handle items
    const items = data.items || [data];
    let itemsHtml = '';
    
    items.forEach(item => {
        const fullItem = findByKey(state.items, 'code', item.itemCode) || { unit: 'Units' };
        itemsHtml += `<tr>
            <td>${item.itemCode}</td>
            <td>${item.itemName || fullItem.name}</td>
            <td style="text-align:center">${parseFloat(item.quantity).toFixed(2)}</td>
            <td style="text-align:center">${fullItem.unit}</td>
        </tr>`;
    });

    const content = `
    <div class="printable-document">
        ${getDocumentHeader('Stock Issue Note', data.batchId)}
        
        <div class="doc-info-grid">
            <div class="info-col">
                <span class="info-label">Issued From</span>
                <div class="info-value">
                    <strong>${fromBranch.branchName}</strong>
                </div>
            </div>
            <div class="info-col">
                <span class="info-label">Issued To Section</span>
                <div class="info-value">
                    <strong>${toSection.sectionName}</strong>
                </div>
            </div>
            <div class="info-col" style="flex: 0 0 200px;">
                <table class="meta-table">
                    <tr><td class="label">Date:</td><td class="val">${new Date(data.date).toLocaleDateString()}</td></tr>
                    <tr><td class="label">Ref #:</td><td class="val">${data.ref}</td></tr>
                </table>
            </div>
        </div>

        <div class="doc-table-container">
            <table class="doc-table">
                <thead><tr><th>Code</th><th>Item Description</th><th style="text-align:center">Quantity</th><th style="text-align:center">Unit</th></tr></thead>
                <tbody>${itemsHtml}</tbody>
            </table>
        </div>

        ${data.notes ? `<div class="doc-notes"><strong>Notes:</strong> ${data.notes}</div>` : ''}

        <div class="doc-signatures">
            <div class="signature-box">Issued By</div>
            <div class="signature-box">Received By</div>
        </div>
    </div>`;
    printContent(content);
};

const generatePODocument = (data) => {
    const supplier = findByKey(state.suppliers, 'supplierCode', data.supplierCode) || { name: 'Unknown' };
    let itemsHtml = '', totalValue = 0;
    
    data.items.forEach(item => {
        const itemDetails = findByKey(state.items, 'code', item.itemCode) || {name: "Unknown"};
        const itemTotal = (parseFloat(item.quantity) || 0) * (parseFloat(item.cost) || 0);
        totalValue += itemTotal;
        itemsHtml += `<tr>
            <td>${item.itemCode}</td>
            <td>${itemDetails.name}</td>
            <td style="text-align:center">${parseFloat(item.quantity).toFixed(2)}</td>
            <td style="text-align:right">${parseFloat(item.cost).toFixed(2)}</td>
            <td style="text-align:right">${itemTotal.toFixed(2)}</td>
        </tr>`;
    });

    const content = `
    <div class="printable-document">
        ${getDocumentHeader('Purchase Order', data.poId || data.batchId, data.Status || 'DRAFT')}
        
        <div class="doc-info-grid">
            <div class="info-col">
                <span class="info-label">Vendor</span>
                <div class="info-value">
                    <strong>${supplier.name}</strong><br>
                    ${supplier.contact || ''}
                </div>
            </div>
            <div class="info-col" style="flex: 0 0 200px;">
                <table class="meta-table">
                    <tr><td class="label">Date:</td><td class="val">${new Date(data.date).toLocaleDateString()}</td></tr>
                    <tr><td class="label">PO #:</td><td class="val">${data.poId || data.batchId}</td></tr>
                </table>
            </div>
        </div>

        <div class="doc-table-container">
            <table class="doc-table">
                <thead><tr><th>Code</th><th>Item Description</th><th style="text-align:center">Qty</th><th style="text-align:right">Unit Cost</th><th style="text-align:right">Total</th></tr></thead>
                <tbody>${itemsHtml}</tbody>
            </table>
        </div>

        <div class="doc-totals">
            <div class="totals-box">
                <div class="total-row final">
                    <span>Total Amount:</span>
                    <span>${totalValue.toFixed(2)} EGP</span>
                </div>
            </div>
        </div>

        <div class="doc-notes">
            <strong>Notes:</strong> ${data.notes || 'None'}
        </div>

        <div class="doc-signatures">
            <div class="signature-box">Authorized By: ${data.createdBy || state.currentUser.Name}</div>
            <div class="signature-box">Supplier Acceptance</div>
        </div>
    </div>`;
    printContent(content);
};

const generatePaymentVoucher = (data) => {
    const supplier = findByKey(state.suppliers, 'supplierCode', data.supplierCode) || { name: 'Unknown' };
    let invoicesHtml = '';
    data.payments.forEach(p => {
        invoicesHtml += `<tr><td>${p.invoiceNumber}</td><td style="text-align:right">${p.amount.toFixed(2)} EGP</td></tr>`;
    });

    const content = `
    <div class="printable-document">
        ${getDocumentHeader('Payment Voucher', data.payments[0].paymentId)}
        
        <div class="doc-info-grid">
            <div class="info-col">
                <span class="info-label">Paid To</span>
                <div class="info-value"><strong>${supplier.name}</strong></div>
            </div>
            <div class="info-col">
                <span class="info-label">Payment Method</span>
                <div class="info-value">${data.method}</div>
            </div>
            <div class="info-col" style="flex: 0 0 200px;">
                <table class="meta-table">
                    <tr><td class="label">Date:</td><td class="val">${new Date(data.date).toLocaleDateString()}</td></tr>
                </table>
            </div>
        </div>

        <div class="doc-table-container">
            <h4 style="margin: 0 0 10px 0; color: #555;">Payment Allocation</h4>
            <table class="doc-table">
                <thead><tr><th>Invoice #</th><th style="text-align:right">Amount Paid</th></tr></thead>
                <tbody>${invoicesHtml}</tbody>
            </table>
        </div>

        <div class="doc-totals">
            <div class="totals-box">
                <div class="total-row final">
                    <span>Total Paid:</span>
                    <span>${data.totalAmount.toFixed(2)} EGP</span>
                </div>
            </div>
        </div>

        <div class="doc-signatures">
            <div class="signature-box">Prepared By</div>
            <div class="signature-box">Approved By</div>
        </div>
    </div>`;
    printContent(content);
};

const generateReturnDocument = (data) => {
    const supplier = findByKey(state.suppliers, 'supplierCode', data.supplierCode) || { name: 'Unknown' };
    const branch = findByKey(state.branches, 'branchCode', data.fromBranchCode) || { branchName: 'Unknown' };
    
    // Handle items
    const items = data.items || [data];
    let itemsHtml = '', totalValue = 0;
    
    items.forEach(item => {
        const itemTotal = item.quantity * item.cost;
        totalValue += itemTotal;
        itemsHtml += `<tr>
            <td>${item.itemCode}</td>
            <td>${item.itemName}</td>
            <td style="text-align:center">${item.quantity.toFixed(2)}</td>
            <td style="text-align:right">${item.cost.toFixed(2)}</td>
            <td style="text-align:right">${itemTotal.toFixed(2)}</td>
        </tr>`;
    });

    const content = `
    <div class="printable-document">
        ${getDocumentHeader('Debit Note / Return', data.ref)}
        
        <div class="doc-info-grid">
            <div class="info-col">
                <span class="info-label">Returned To</span>
                <div class="info-value"><strong>${supplier.name}</strong></div>
            </div>
            <div class="info-col">
                <span class="info-label">Returned From</span>
                <div class="info-value"><strong>${branch.branchName}</strong></div>
            </div>
            <div class="info-col" style="flex: 0 0 200px;">
                <table class="meta-table">
                    <tr><td class="label">Date:</td><td class="val">${new Date(data.date).toLocaleDateString()}</td></tr>
                </table>
            </div>
        </div>

        <div class="doc-table-container">
            <table class="doc-table">
                <thead><tr><th>Code</th><th>Item</th><th style="text-align:center">Qty</th><th style="text-align:right">Cost</th><th style="text-align:right">Total</th></tr></thead>
                <tbody>${itemsHtml}</tbody>
            </table>
        </div>

        <div class="doc-totals">
            <div class="totals-box">
                <div class="total-row final">
                    <span>Total Value:</span>
                    <span>${totalValue.toFixed(2)} EGP</span>
                </div>
            </div>
        </div>

        ${data.notes ? `<div class="doc-notes"><strong>Reason:</strong> ${data.notes}</div>` : ''}
        
        <div class="doc-signatures">
            <div class="signature-box">Returned By</div>
            <div class="signature-box">Supplier Signature</div>
        </div>
    </div>`;
    printContent(content);
};

const generateRequestIssueDocument = (data) => {
    const fromBranch = findByKey(state.branches, 'branchCode', data.fromBranchCode) || { branchName: 'Unknown' };
    const toSection = findByKey(state.sections, 'sectionCode', data.sectionCode) || { sectionName: 'Unknown' };
    
    // Handle items
    const items = data.items || [data];
    let itemsHtml = '';
    
    items.forEach(item => {
        const fullItem = findByKey(state.items, 'code', item.itemCode) || { name: 'Unknown', unit: 'Units' };
        itemsHtml += `<tr>
            <td>${item.itemCode}</td>
            <td>${item.itemName || fullItem.name}</td>
            <td style="text-align:center">${parseFloat(item.quantity).toFixed(2)}</td>
            <td style="text-align:center">${fullItem.unit}</td>
        </tr>`;
    });

    const content = `
    <div class="printable-document">
        ${getDocumentHeader('Stock Issue (Draft)', data.ref, 'DRAFT')}
        
        <div class="doc-info-grid">
            <div class="info-col">
                <span class="info-label">From Branch</span>
                <div class="info-value"><strong>${fromBranch.branchName}</strong></div>
            </div>
            <div class="info-col">
                <span class="info-label">To Section</span>
                <div class="info-value"><strong>${toSection.sectionName}</strong></div>
            </div>
            <div class="info-col" style="flex: 0 0 200px;">
                <table class="meta-table">
                    <tr><td class="label">Date:</td><td class="val">${new Date(data.date).toLocaleDateString()}</td></tr>
                </table>
            </div>
        </div>

        <div class="doc-table-container">
            <table class="doc-table">
                <thead><tr><th>Code</th><th>Item</th><th style="text-align:center">Qty</th><th style="text-align:center">Unit</th></tr></thead>
                <tbody>${itemsHtml}</tbody>
            </table>
        </div>

        <div class="doc-notes">
            <p><em>This is a draft generated from an Item Request approval.</em></p>
            ${data.notes ? `<strong>Notes:</strong> ${data.notes}` : ''}
        </div>
    </div>`;
    printContent(content);
};

const generateAdjustmentDocument = (data) => {
    const branch = findByKey(state.branches, 'branchCode', data.fromBranchCode) || { branchName: 'Unknown' };
    
    // Handle items
    const items = data.items || [data];
    let itemsHtml = '';
    
    items.forEach(item => {
        const fullItem = findByKey(state.items, 'code', item.itemCode) || { name: 'Unknown', unit: 'Units' };
        const typeDisplay = item.type === 'adjustment_in' ? 'Increase (+)' : 'Decrease (-)';
        itemsHtml += `<tr>
            <td>${item.itemCode}</td>
            <td>${fullItem.name}</td>
            <td style="text-align:center">${parseFloat(item.quantity).toFixed(2)}</td>
            <td style="text-align:center">${typeDisplay}</td>
        </tr>`;
    });

    const content = `
    <div class="printable-document">
        ${getDocumentHeader('Stock Adjustment Note', data.batchId)}
        <div class="doc-info-grid">
            <div class="info-col"><span class="info-label">Branch</span><div class="info-value"><strong>${branch.branchName}</strong></div></div>
            <div class="info-col" style="flex: 0 0 200px;"><table class="meta-table"><tr><td class="label">Date:</td><td class="val">${new Date(data.date).toLocaleDateString()}</td></tr><tr><td class="label">Ref:</td><td class="val">${data.ref}</td></tr></table></div>
        </div>
        <div class="doc-table-container"><table class="doc-table"><thead><tr><th>Code</th><th>Item</th><th style="text-align:center">Qty</th><th style="text-align:center">Type</th></tr></thead><tbody>${itemsHtml}</tbody></table></div>
        <div class="doc-notes"><strong>Notes:</strong> ${data.notes || 'None'}</div>
        <div class="doc-signatures"><div class="signature-box">Adjusted By</div><div class="signature-box">Approved By</div></div>
    </div>`;
    printContent(content);
};
