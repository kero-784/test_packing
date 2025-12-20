import { state, modalContext } from './state.js';
import { showView, closeModal, showToast, setButtonLoading, openItemSelectorModal, openEditModal, openHistoryModal } from './ui.js';
import { postData } from './api.js';
import { _t } from './i18n.js';
import * as Render from './render.js';

export function attachEventListeners(reloadDataAndRefreshUI) {
    // Navigation
    document.querySelectorAll('#main-nav a:not(#btn-logout)').forEach(link => {
        link.addEventListener('click', e => {
            e.preventDefault();
            showView(link.dataset.view, null, reloadDataAndRefreshUI);
        });
    });

    // Sidebar: Language & Refresh
    document.getElementById('lang-switcher').addEventListener('change', e => {
        state.currentLanguage = e.target.value;
        localStorage.setItem('userLanguage', state.currentLanguage);
        location.reload(); 
    });

    // Opening Modals
    document.querySelectorAll('[data-context]').forEach(btn => {
        btn.addEventListener('click', (e) => openItemSelectorModal(e.currentTarget.dataset.context));
    });

    // Item Selection Modal Confirmation
    document.getElementById('btn-confirm-modal-selection').addEventListener('click', () => {
        const context = modalContext.value;
        const listMap = {
            'receive': 'currentReceiveList',
            'issue': 'currentIssueList',
            'transfer': 'currentTransferList',
            'adjustment': 'currentAdjustmentList'
        };
        const listName = listMap[context];
        
        state.modalSelections.forEach(code => {
            if (!state[listName].find(i => i.itemCode === code)) {
                const item = state.items.find(i => i.code === code);
                state[listName].push({ itemCode: code, itemName: item.name, quantity: 0, cost: item.cost || 0 });
            }
        });
        
        // Refresh the specific table
        if(context === 'receive') Render.renderReceiveListTable();
        if(context === 'issue') Render.renderIssueListTable();
        if(context === 'transfer') Render.renderTransferListTable();
        if(context === 'adjustment') Render.renderAdjustmentListTable();
        
        closeModal();
    });

    // Table Row Input Changes & Removal (Delegation)
    document.addEventListener('input', e => {
        if (e.target.classList.contains('table-input')) {
            const idx = e.target.dataset.index;
            const field = e.target.dataset.field;
            const tableId = e.target.closest('table').id;

            let list;
            if (tableId === 'table-receive-list') list = state.currentReceiveList;
            else if (tableId === 'table-issue-list') list = state.currentIssueList;
            else if (tableId === 'table-transfer-list') list = state.currentTransferList;
            else if (tableId === 'table-adjustment-list') list = state.currentAdjustmentList;

            if (list && list[idx]) {
                list[idx][field] = parseFloat(e.target.value) || 0;
                // Update totals if applicable
                if (tableId === 'table-receive-list') Render.updateReceiveGrandTotal();
                if (tableId === 'table-issue-list') Render.updateIssueGrandTotal();
                if (tableId === 'table-transfer-list') Render.updateTransferGrandTotal();
            }
        }
    });

    document.addEventListener('click', e => {
        if (e.target.classList.contains('btn-remove-row')) {
            const idx = e.target.dataset.index;
            const tableId = e.target.closest('table').id;
            if (tableId === 'table-receive-list') { state.currentReceiveList.splice(idx, 1); Render.renderReceiveListTable(); }
            if (tableId === 'table-issue-list') { state.currentIssueList.splice(idx, 1); Render.renderIssueListTable(); }
            if (tableId === 'table-transfer-list') { state.currentTransferList.splice(idx, 1); Render.renderTransferListTable(); }
            if (tableId === 'table-adjustment-list') { state.currentAdjustmentList.splice(idx, 1); Render.renderAdjustmentListTable(); }
        }
        
        // History & Edit Buttons
        if (e.target.classList.contains('btn-history')) openHistoryModal(e.target.dataset.id);
        if (e.target.classList.contains('btn-edit')) openEditModal(e.target.dataset.type, e.target.dataset.id);
    });

    // Transaction Submissions
    document.getElementById('btn-submit-receive-batch').addEventListener('click', async (e) => {
        const payload = {
            type: 'receive',
            batchId: `GRN-${Date.now()}`,
            supplierCode: document.getElementById('receive-supplier').value,
            branchCode: document.getElementById('receive-branch').value,
            invoiceNumber: document.getElementById('receive-invoice').value,
            date: new Date().toISOString(),
            items: state.currentReceiveList
        };
        const res = await postData('addTransactionBatch', payload, e.currentTarget, showToast, setButtonLoading);
        if (res) {
            state.currentReceiveList = [];
            Render.renderReceiveListTable();
            reloadDataAndRefreshUI();
        }
    });

    // Search Listeners
    document.getElementById('item-inquiry-search').addEventListener('input', e => Render.renderItemInquiry(e.target.value.toLowerCase()));
    
    // Generic Modal Close
    document.querySelectorAll('.close-button, .modal-cancel').forEach(b => b.addEventListener('click', closeModal));
}
