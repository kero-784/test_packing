import { state, modalContext } from './state.js';
import { showView, closeModal, showToast, setButtonLoading, openItemSelectorModal, openEditModal, openHistoryModal } from './ui.js';
import { postData } from './api.js';
import { applyTranslations } from './i18n.js';
import * as Render from './render.js';

export function attachEventListeners(reloadDataAndRefreshUI, refreshViewData) {
    // 1. Navigation
    document.querySelectorAll('#main-nav a:not(#btn-logout)').forEach(link => {
        link.addEventListener('click', e => {
            e.preventDefault();
            showView(link.dataset.view, null, refreshViewData);
        });
    });

    // 2. Sub-tabs
    document.addEventListener('click', e => {
        const subTab = e.target.closest('.sub-nav-item');
        if (subTab) {
            const viewId = subTab.closest('.view').id.replace('view-', '');
            showView(viewId, subTab.dataset.subview, refreshViewData);
        }
    });

    // 3. Modals & Item Selection
    document.querySelectorAll('[data-context]').forEach(btn => {
        btn.addEventListener('click', e => openItemSelectorModal(e.currentTarget.dataset.context));
    });

    document.getElementById('btn-confirm-modal-selection')?.addEventListener('click', () => {
        const ctx = modalContext.value;
        const listName = { 'receive':'currentReceiveList', 'issue':'currentIssueList', 'transfer':'currentTransferList', 'adjustment':'currentAdjustmentList' }[ctx];
        
        state.modalSelections.forEach(code => {
            if (!state[listName].find(i => i.itemCode === code)) {
                const item = state.items.find(i => i.code === code);
                state[listName].push({ itemCode: code, itemName: item.name, quantity: 0, cost: item.cost || 0 });
            }
        });
        
        const renderMap = { 'receive': Render.renderReceiveListTable, 'issue': Render.renderIssueListTable, 'transfer': Render.renderTransferListTable, 'adjustment': Render.renderAdjustmentListTable };
        if (renderMap[ctx]) renderMap[ctx]();
        closeModal();
    });

    // 4. Input Handling (Live Update)
    document.addEventListener('input', e => {
        if (e.target.classList.contains('table-input')) {
            const el = e.target;
            const tableId = el.closest('table').id;
            const list = { 'table-receive-list':'currentReceiveList', 'table-issue-list':'currentIssueList', 'table-transfer-list':'currentTransferList', 'table-adjustment-list':'currentAdjustmentList' }[tableId];
            
            if (list && state[list][el.dataset.index]) {
                state[list][el.dataset.index][el.dataset.field] = parseFloat(el.value) || 0;
                if (tableId === 'table-receive-list') Render.updateReceiveGrandTotal();
            }
        }
        if (e.target.id === 'item-inquiry-search') Render.renderItemInquiry(e.target.value.toLowerCase());
    });

    // 5. Submit Logic
    document.getElementById('btn-submit-receive-batch')?.addEventListener('click', async (e) => {
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
        if (res) { state.currentReceiveList = []; Render.renderReceiveListTable(); reloadDataAndRefreshUI(); }
    });

    // 6. Common Actions
    document.addEventListener('click', e => {
        const btn = e.target.closest('button');
        if (!btn) return;
        
        if (btn.classList.contains('btn-remove-row')) {
            const tableId = btn.closest('table').id;
            const list = { 'table-receive-list':'currentReceiveList', 'table-issue-list':'currentIssueList', 'table-transfer-list':'currentTransferList', 'table-adjustment-list':'currentAdjustmentList' }[tableId];
            state[list].splice(btn.dataset.index, 1);
            Render[{ 'currentReceiveList':'renderReceiveListTable', 'currentIssueList':'renderIssueListTable', 'currentTransferList':'renderTransferListTable', 'currentAdjustmentList':'renderAdjustmentListTable' }[list]]();
        }

        if (btn.classList.contains('btn-edit')) openEditModal(btn.dataset.type, btn.dataset.id);
        if (btn.classList.contains('btn-history')) openHistoryModal(btn.dataset.id);
        if (btn.id === 'global-refresh-button') reloadDataAndRefreshUI();
        if (btn.classList.contains('close-button') || btn.classList.contains('modal-cancel')) closeModal();
    });
}
