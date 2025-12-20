import { state } from './state.js';
import { CONFIG, Logger } from './config.js';
import { attemptLogin, postData } from './api.js';
import { showView, showToast, setButtonLoading, closeModal } from './ui.js';
import { applyTranslations } from './i18n.js'; // Fixed: Correct source for translation logic
import { attachEventListeners } from './events.js';
import { findByKey, userCan, populateOptions } from './utils.js';
import { calculateStockLevels } from './calculations.js';
import * as Render from './render.js';

async function reloadDataAndRefreshUI() {
    Logger.info('Reloading all data from server...');
    const { username, loginCode } = state;
    if (!username || !loginCode) return;

    const globalRefreshBtn = document.getElementById('global-refresh-button');
    setButtonLoading(true, globalRefreshBtn);

    try {
        const response = await fetch(`${CONFIG.SCRIPT_URL}?username=${encodeURIComponent(username)}&loginCode=${encodeURIComponent(loginCode)}`);
        if (!response.ok) throw new Error('Network response was not ok');
        
        const data = await response.json();
        if (data.status === 'error') throw new Error(data.message);

        Object.keys(data).forEach(key => {
            if (key !== 'user') state[key] = data[key] || [];
        });

        updateUserBranchDisplay();
        Render.updatePendingRequestsWidget();

        const currentViewId = document.querySelector('.nav-item a.active')?.dataset.view || 'dashboard';
        await refreshViewData(currentViewId);

        showToast('Data refreshed successfully', 'success');
    } catch (err) {
        Logger.error('Data reload failed:', err);
        showToast('Refresh failed. Please check connection.', 'error');
    } finally {
        setButtonLoading(false, globalRefreshBtn);
    }
}

async function refreshViewData(viewId) {
    if (!state.currentUser) return;
    Logger.info(`Refreshing data for view: ${viewId}`);

    switch (viewId) {
        case 'dashboard':
            const stock = calculateStockLevels();
            document.getElementById('dashboard-total-items').textContent = (state.items || []).length.toLocaleString();
            document.getElementById('dashboard-total-suppliers').textContent = (state.suppliers || []).length;
            document.getElementById('dashboard-total-branches').textContent = (state.branches || []).length;
            let totalVal = 0;
            Object.values(stock).forEach(bs => Object.values(bs).forEach(i => totalVal += i.quantity * (i.avgCost || 0)));
            document.getElementById('dashboard-total-value').textContent = `${totalVal.toFixed(2)} EGP`;
            break;

        case 'master-data':
            Render.renderItemsTable();
            Render.renderSuppliersTable();
            Render.renderBranchesTable();
            Render.renderSectionsTable();
            break;

        case 'stock-levels':
            Render.renderItemCentricStockView();
            Render.renderItemInquiry('');
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
            const userRes = await postData('getAllUsersAndRoles', {}, null, showToast, setButtonLoading);
            if (userRes) {
                state.allUsers = userRes.data.users;
                state.allRoles = userRes.data.roles;
                Render.renderUserManagementUI();
            }
            break;

        case 'activity-log':
            Render.renderActivityLog();
            break;
    }
}

function updateUserBranchDisplay() {
    const displayEl = document.getElementById('user-branch-display');
    if (!state.currentUser || !displayEl) return;
    const branch = findByKey(state.branches, 'branchCode', state.currentUser.AssignedBranchCode);
    const section = findByKey(state.sections, 'sectionCode', state.currentUser.AssignedSectionCode);
    let text = '';
    if (branch) text += `Branch: ${branch.branchName}`;
    if (section) text += `${text ? ' / ' : ''}Section: ${section.sectionName}`;
    displayEl.textContent = text;
}

document.addEventListener('DOMContentLoaded', () => {
    const savedLang = localStorage.getItem('userLanguage') || 'en';
    state.currentLanguage = savedLang;
    document.getElementById('lang-switcher').value = savedLang;
    applyTranslations();

    const loginForm = document.getElementById('login-form');
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('login-username').value.trim();
        const code = document.getElementById('login-code').value;

        const loginUI = {
            form: loginForm,
            errorEl: document.getElementById('login-error'),
            loader: document.getElementById('login-loader')
        };

        const result = await attemptLogin(username, code, loginUI);
        
        if (result.success) {
            document.getElementById('login-container').style.display = 'none';
            document.getElementById('app-container').style.display = 'flex';
            
            const userFirstName = state.currentUser.Name.split(' ')[0];
            document.querySelector('.sidebar-header h1').textContent = `Hi, ${userFirstName}`;

            attachEventListeners(reloadDataAndRefreshUI);
            showView('dashboard', null, (v) => refreshViewData(v));
            updateUserBranchDisplay();
            Render.updatePendingRequestsWidget();
        }
    });
});
