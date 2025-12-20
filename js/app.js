import { state } from './state.js';
import { CONFIG, Logger } from './config.js';
import { attemptLogin, postData } from './api.js';
import { showView, showToast, setButtonLoading } from './ui.js';
import { applyTranslations } from './i18n.js';
import { attachEventListeners } from './events.js';
import { findByKey, userCan, populateOptions } from './utils.js';
import { calculateStockLevels } from './calculations.js';
import * as Render from './render.js';

/**
 * Fetches the latest data from Google Sheets and refreshes the current UI view.
 */
async function reloadDataAndRefreshUI() {
    Logger.info('Reloading data...');
    const { username, loginCode } = state;
    if (!username || !loginCode) return;

    const globalRefreshBtn = document.getElementById('global-refresh-button');
    setButtonLoading(true, globalRefreshBtn);

    try {
        const response = await fetch(`${CONFIG.SCRIPT_URL}?username=${encodeURIComponent(username)}&loginCode=${encodeURIComponent(loginCode)}`);
        if (!response.ok) throw new Error('Failed to connect to server.');
        
        const data = await response.json();
        if (data.status === 'error') throw new Error(data.message);

        // Sync local state with server data
        Object.keys(data).forEach(key => {
            if (key !== 'user') state[key] = data[key] || [];
        });

        updateUserBranchDisplay();
        Render.updatePendingRequestsWidget();

        const currentView = document.querySelector('.nav-item a.active')?.dataset.view || 'dashboard';
        await refreshViewData(currentView);

        showToast('Data refreshed!', 'success');
    } catch (err) {
        Logger.error('Reload failed:', err);
        showToast('Could not refresh data.', 'error');
    } finally {
        setButtonLoading(false, globalRefreshBtn);
    }
}

/**
 * Orchestrates rendering for specific views.
 */
async function refreshViewData(viewId) {
    if (!state.currentUser) return;
    
    switch(viewId) {
        case 'dashboard':
            const stock = calculateStockLevels();
            document.getElementById('dashboard-total-items').textContent = state.items.length.toLocaleString();
            document.getElementById('dashboard-total-suppliers').textContent = state.suppliers.length;
            document.getElementById('dashboard-total-branches').textContent = state.branches.length;
            let totalValue = 0;
            Object.values(stock).forEach(bs => Object.values(bs).forEach(i => totalValue += i.quantity * i.avgCost));
            document.getElementById('dashboard-total-value').textContent = `${totalValue.toFixed(2)} EGP`;
            break;

        case 'master-data':
            Render.renderItemsTable();
            Render.renderSuppliersTable();
            Render.renderBranchesTable();
            Render.renderSectionsTable();
            break;

        case 'operations':
            populateOptions(document.getElementById('receive-supplier'), state.suppliers, 'Select Supplier', 'supplierCode', 'name');
            populateOptions(document.getElementById('receive-branch'), state.branches, 'Select Branch', 'branchCode', 'branchName');
            populateOptions(document.getElementById('transfer-from-branch'), state.branches, 'Select Branch', 'branchCode', 'branchName');
            populateOptions(document.getElementById('transfer-to-branch'), state.branches, 'Select Branch', 'branchCode', 'branchName');
            populateOptions(document.getElementById('issue-from-branch'), state.branches, 'Select Branch', 'branchCode', 'branchName');
            populateOptions(document.getElementById('issue-to-section'), state.sections, 'Select Section', 'sectionCode', 'sectionName');
            Render.renderReceiveListTable();
            Render.renderIssueListTable();
            Render.renderTransferListTable();
            Render.renderAdjustmentListTable();
            break;

        case 'stock-levels':
            Render.renderItemCentricStockView();
            Render.renderItemInquiry('');
            break;

        case 'transaction-history':
            Render.renderTransactionHistory({
                startDate: document.getElementById('tx-filter-start-date').value,
                endDate: document.getElementById('tx-filter-end-date').value,
                type: document.getElementById('tx-filter-type').value,
                branch: document.getElementById('tx-filter-branch').value,
                searchTerm: document.getElementById('transaction-search').value
            });
            break;

        case 'user-management':
            const res = await postData('getAllUsersAndRoles', {}, null, showToast, setButtonLoading);
            if (res) {
                state.allUsers = res.data.users;
                state.allRoles = res.data.roles;
                Render.renderUserManagementUI();
            }
            break;

        case 'activity-log':
            Render.renderActivityLog();
            break;
    }
    applyTranslations();
}

function updateUserBranchDisplay() {
    const el = document.getElementById('user-branch-display');
    if (!state.currentUser || !el) return;
    const branch = findByKey(state.branches, 'branchCode', state.currentUser.AssignedBranchCode);
    const section = findByKey(state.sections, 'sectionCode', state.currentUser.AssignedSectionCode);
    let text = branch ? `Branch: ${branch.branchName}` : '';
    if (section) text += (text ? ' / ' : '') + `Section: ${section.sectionName}`;
    el.textContent = text;
}

document.addEventListener('DOMContentLoaded', () => {
    const savedLang = localStorage.getItem('userLanguage') || 'en';
    state.currentLanguage = savedLang;
    applyTranslations();

    const loginForm = document.getElementById('login-form');
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const user = document.getElementById('login-username').value.trim();
        const code = document.getElementById('login-code').value;

        const ui = {
            form: loginForm,
            errorEl: document.getElementById('login-error'),
            loader: document.getElementById('login-loader')
        };

        const result = await attemptLogin(user, code, ui);
        if (result.success) {
            document.getElementById('login-container').style.display = 'none';
            document.getElementById('app-container').style.display = 'flex';
            attachEventListeners(reloadDataAndRefreshUI);
            showView('dashboard', null, refreshViewData);
            updateUserBranchDisplay();
        }
    });
});
