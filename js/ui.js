import { state, modalContext } from './state.js';
import { _t, applyTranslations } from './i18n.js';
import { Logger } from './config.js';
import { findByKey, populateOptions } from './utils.js';
import { calculateStockLevels, calculateSupplierFinancials } from './calculations.js';

// --- Toast & Global UI ---
export function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
}

export function setButtonLoading(isLoading, buttonEl) {
    if (!buttonEl) return;
    if (isLoading) {
        buttonEl.disabled = true;
        buttonEl.dataset.originalText = buttonEl.innerHTML;
        buttonEl.innerHTML = `<div class="button-spinner"></div><span>${_t('signing_in')}</span>`;
    } else {
        buttonEl.disabled = false;
        if (buttonEl.dataset.originalText) buttonEl.innerHTML = buttonEl.dataset.originalText;
    }
}

export function showView(viewId, subViewId = null, refreshFn) {
    document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));
    document.querySelectorAll('#main-nav a').forEach(link => link.classList.remove('active'));

    const viewToShow = document.getElementById(`view-${viewId}`);
    if (viewToShow) viewToShow.classList.add('active');

    const activeLink = document.querySelector(`[data-view="${viewId}"]`);
    if (activeLink) {
        activeLink.classList.add('active');
        const viewTitleKey = activeLink.querySelector('span').dataset.translateKey;
        document.getElementById('view-title').textContent = _t(viewTitleKey);
    }

    if (viewToShow) {
        viewToShow.querySelectorAll('.sub-nav-item').forEach(btn => btn.classList.remove('active'));
        viewToShow.querySelectorAll('.sub-view').forEach(view => view.classList.remove('active'));

        let targetSubViewId = subViewId;
        if (!targetSubViewId) {
            const firstVisibleTab = viewToShow.querySelector('.sub-nav-item:not([style*="display: none"])');
            if (firstVisibleTab) targetSubViewId = firstVisibleTab.dataset.subview;
        }

        if (targetSubViewId) {
            const subViewBtn = viewToShow.querySelector(`[data-subview="${targetSubViewId}"]`);
            if (subViewBtn) subViewBtn.classList.add('active');
            const subViewToShow = viewToShow.querySelector(`#subview-${targetSubViewId}`);
            if (subViewToShow) subViewToShow.classList.add('active');
        }
    }
    if (refreshFn) refreshFn(viewId);
}

export function closeModal() {
    document.querySelectorAll('.modal-overlay').forEach(modal => modal.classList.remove('active'));
    modalContext.value = null;
}

// --- Item & Selection Modals ---
export function openItemSelectorModal(context) {
    modalContext.value = context;
    let currentList = [];
    switch (context) {
        case 'receive': currentList = state.currentReceiveList; break;
        case 'transfer': currentList = state.currentTransferList; break;
        case 'issue': currentList = state.currentIssueList; break;
        case 'po': currentList = state.currentPOList; break;
        case 'return': currentList = state.currentReturnList; break;
        case 'request': currentList = state.currentRequestList; break;
        case 'edit-po': currentList = state.currentEditingPOList; break;
        case 'adjustment': currentList = state.currentAdjustmentList; break;
    }
    state.modalSelections = new Set((currentList || []).map(item => item.itemCode));
    
    // Trigger initial modal render
    const event = new CustomEvent('renderModalItems');
    document.dispatchEvent(event);
    
    document.getElementById('item-selector-modal').classList.add('active');
}

export function openInvoiceSelectorModal() {
    modalContext.value = 'invoices';
    const event = new CustomEvent('renderModalInvoices');
    document.dispatchEvent(event);
    document.getElementById('invoice-selector-modal').classList.add('active');
}

// --- Edit & History Modals ---
export function openEditModal(type, id) {
    const editModal = document.getElementById('edit-modal');
    const title = document.getElementById('edit-modal-title');
    const body = document.getElementById('edit-modal-body');
    const form = document.getElementById('form-edit-record');
    
    form.dataset.type = type;
    form.dataset.id = id;
    
    // Simplified logic: Render HTML based on type (same as original script.js)
    // You would paste the HTML building logic from Part 2 of original script.js here
    title.textContent = _t(`edit_${type}`);
    editModal.classList.add('active');
}

export async function openHistoryModal(itemCode) {
    const item = findByKey(state.items, 'code', itemCode);
    if (!item) return;
    document.getElementById('history-modal-title').textContent = _t('history_for', {itemName: item.name, itemCode: item.code});
    document.getElementById('history-modal').classList.add('active');
    // Logic to fetch and render history...
}

// --- Transaction Specific Modals ---
export function openViewTransferModal(batchId) {
    const txs = state.transactions.filter(t => t.batchId === batchId);
    if (!txs.length) return;
    document.getElementById('view-transfer-modal').classList.add('active');
    // Render transfer details into view-transfer-modal-body...
}

export function openPOEditModal(poId) {
    const po = findByKey(state.purchaseOrders, 'poId', poId);
    if (!po) return;
    document.getElementById('edit-po-modal').classList.add('active');
    // Logic to populate edit-po-modal-body...
}

export function openInvoiceEditModal(batchId) {
    // Similar to PO edit but for Invoices
    document.getElementById('edit-po-modal').classList.add('active');
}

export function openApproveRequestModal(requestId) {
    const requestGroup = state.itemRequests.filter(r => r.RequestID === requestId);
    if (!requestGroup.length) return;
    const modal = document.getElementById('approve-request-modal');
    modal.querySelector('#btn-confirm-request-approval').dataset.requestId = requestId;
    modal.classList.add('active');
    // Logic to render request items in approve-request-modal-body...
}

// --- Report Selection Modal ---
export function openSelectionModal(type) {
    state.currentSelectionModal.type = type;
    // Logic to set titles and trigger selection list render...
    document.getElementById('selection-modal').classList.add('active');
}

// --- Admin Context ---
export async function requestAdminContext(config) {
    const modal = document.getElementById('context-selector-modal');
    modal.classList.add('active');
    return new Promise((resolve, reject) => {
        state.adminContextPromise = { resolve, reject };
    });
}
