import { state, modalContext } from './state.js';
import { showView, closeModal, showToast, setButtonLoading, openItemSelectorModal, openEditModal } from './ui.js';
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

    // 2. Sub-tabs Logic
    document.addEventListener('click', e => {
        const subTab = e.target.closest('.sub-nav-item');
        if (subTab) {
            const viewId = subTab.closest('.view').id.replace('view-', '');
            showView(viewId, subTab.dataset.subview, refreshViewData);
        }
    });

    // 3. Modals
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
        
        const renderFunc = Render[`render${ctx.charAt(0).toUpperCase() + ctx.slice(1)}ListTable`];
        if (renderFunc) renderFunc();
        closeModal();
    });

    // 4. Global Actions
    document.addEventListener('click', e => {
        const btn = e.target.closest('button');
        if (!btn) return;
        if (btn.classList.contains('btn-remove-row')) {
            const tableId = btn.closest('table').id;
            const listKey = { 'table-receive-list':'currentReceiveList', 'table-issue-list':'currentIssueList', 'table-transfer-list':'currentTransferList', 'table-adjustment-list':'currentAdjustmentList' }[tableId];
            state[listKey].splice(btn.dataset.index, 1);
            Render[`render${listKey.charAt(7).toUpperCase() + listKey.slice(8, -4)}ListTable`]();
        }
        if (btn.classList.contains('btn-edit')) openEditModal(btn.dataset.type, btn.dataset.id);
        if (btn.id === 'global-refresh-button') reloadDataAndRefreshUI();
        if (btn.classList.contains('close-button') || btn.classList.contains('modal-cancel')) closeModal();
    });

    document.getElementById('lang-switcher')?.addEventListener('change', e => {
        state.currentLanguage = e.target.value;
        localStorage.setItem('userLanguage', state.currentLanguage);
        applyTranslations();
        reloadDataAndRefreshUI();
    });
}
