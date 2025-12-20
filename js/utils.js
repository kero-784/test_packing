import { state } from './state.js';
import { _t } from './i18n.js';

export const findByKey = (array, key, value) => (array || []).find(el => el && String(el[key]) === String(value));

export const generateId = (prefix) => `${prefix}-${Date.now()}`;

export const printContent = (content) => {
    const printArea = document.getElementById('print-area');
    printArea.innerHTML = content;
    setTimeout(() => window.print(), 200);
};

export const exportToExcel = (tableId, filename, showToast) => {
    try {
        const table = document.getElementById(tableId);
        if (!table) {
            showToast('Please generate a report first.', 'error');
            return;
        }
        const wb = XLSX.utils.table_to_book(table, {sheet: "Sheet1"});
        XLSX.writeFile(wb, filename);
        showToast('Exporting to Excel...', 'success');
    } catch (err) {
        showToast('Excel export failed.', 'error');
        console.error('Export Error:', err);
    }
};

export const populateOptions = (el, data, ph, valueKey, textKey, textKey2) => { 
    if (!el) { console.warn(`populateOptions failed: element is null for placeholder "${ph}"`); return; }
    el.innerHTML = `<option value="">${ph}</option>`; 
    (data || []).forEach(item => { 
        el.innerHTML += `<option value="${item[valueKey]}">${item[textKey]}${textKey2 && item[textKey2] ? ' (' + item[textKey2] + ')' : ''}</option>`;
    }); 
};

export function userCan(permission) {
    if (!state.currentUser || !state.currentUser.permissions) return false;
    const p = state.currentUser.permissions[permission];
    return p === true || String(p).toUpperCase() === 'TRUE';
}

export function getVisibleBranchesForCurrentUser() {
    if (!state.currentUser) return [];
    if (userCan('viewAllBranches')) {
        return state.branches;
    }
    if (state.currentUser.AssignedBranchCode) {
        return state.branches.filter(b => String(b.branchCode) === String(state.currentUser.AssignedBranchCode));
    }
    return [];
}