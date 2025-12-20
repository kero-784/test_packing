import { state, modalContext } from './state.js';
import { _t, applyTranslations } from './i18n.js';
import { postData } from './api.js';
import { showView, closeModal, showToast, setButtonLoading } from './ui.js';
import { generateId, exportToExcel, findByKey, printContent } from './utils.js';
import * as Render from './render.js';
import * as Docs from './docs.js';

export function attachEventListeners(reloadDataAndRefreshUI) {
    // --- Global Actions ---
    document.getElementById('btn-logout').addEventListener('click', () => location.reload());
    document.getElementById('global-refresh-button').addEventListener('click', reloadDataAndRefreshUI);

    // --- Navigation ---
    document.querySelectorAll('#main-nav a:not(#btn-logout)').forEach(link => {
        link.addEventListener('click', e => {
            e.preventDefault();
            showView(link.dataset.view, null, (v) => reloadDataAndRefreshUI(v));
        });
    });

    // --- Search & Filters ---
    const attachSearch = (id, renderFn, dataKey, keys) => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', e => {
            const term = e.target.value.toLowerCase();
            renderFn(term ? state[dataKey].filter(i => keys.some(k => String(i[k]).toLowerCase().includes(term))) : state[dataKey]);
        });
    };
    attachSearch('search-items', Render.renderItemsTable, 'items', ['name', 'code', 'category']);
    attachSearch('search-suppliers', Render.renderSuppliersTable, 'suppliers', ['name', 'supplierCode']);
    attachSearch('stock-levels-search', Render.renderItemCentricStockView, 'items', ['name', 'code']);

    // --- Table Input Listeners (Live Updates) ---
    const setupTableListener = (tableId, listName, renderFn) => {
        const table = document.getElementById(tableId);
        if (!table) return;
        table.addEventListener('change', e => {
            if (e.target.classList.contains('table-input')) {
                const idx = parseInt(e.target.dataset.index);
                const field = e.target.dataset.field;
                state[listName][idx][field] = e.target.type === 'number' ? parseFloat(e.target.value) : e.target.value;
                renderFn();
            }
        });
        table.addEventListener('click', e => {
            const btn = e.target.closest('button.danger');
            if (btn && btn.dataset.index) {
                state[listName].splice(btn.dataset.index, 1);
                renderFn();
            }
        });
    };
    setupTableListener('table-receive-list', 'currentReceiveList', Render.renderReceiveListTable);
    setupTableListener('table-issue-list', 'currentIssueList', Render.renderIssueListTable);
    setupTableListener('table-transfer-list', 'currentTransferList', Render.renderTransferListTable);
    setupTableListener('table-adjustment-list', 'currentAdjustmentList', Render.renderAdjustmentListTable);
    setupTableListener('table-po-list', 'currentPOList', Render.renderPOListTable);

    // --- Form Submissions ---
    document.getElementById('form-add-item')?.addEventListener('submit', async e => {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        const data = Object.fromEntries(new FormData(e.target));
        const res = await postData('addItem', data, btn, showToast, setButtonLoading);
        if (res) { showToast(_t('add_success_toast', {type: _t('item')})); e.target.reset(); reloadDataAndRefreshUI(); }
    });

    // --- Stock Operations Submits ---
    document.getElementById('btn-submit-receive-batch')?.addEventListener('click', async e => {
        const btn = e.currentTarget;
        const payload = {
            type: 'receive',
            batchId: `GRN-${Date.now()}`,
            supplierCode: document.getElementById('receive-supplier').value,
            branchCode: document.getElementById('receive-branch').value,
            invoiceNumber: document.getElementById('receive-invoice').value,
            date: new Date().toISOString(),
            items: state.currentReceiveList
        };
        const res = await postData('addTransactionBatch', payload, btn, showToast, setButtonLoading);
        if (res) { 
            showToast(_t('tx_processed_toast', {txType: _t('receive')}));
            state.currentReceiveList = [];
            Render.renderReceiveListTable();
            reloadDataAndRefreshUI();
        }
    });

    // --- Exports ---
    document.getElementById('btn-export-items')?.addEventListener('click', () => exportToExcel('table-items', 'Items.xlsx', showToast));
    document.getElementById('btn-export-stock')?.addEventListener('click', () => exportToExcel('table-stock-levels-by-item', 'Stock.xlsx', showToast));

    // --- Language Switcher ---
    document.getElementById('lang-switcher').addEventListener('change', e => {
        state.currentLanguage = e.target.value;
        localStorage.setItem('userLanguage', state.currentLanguage);
        applyTranslations();
        reloadDataAndRefreshUI();
    });
}