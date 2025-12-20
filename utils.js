window.printReport = function(elementId) {
    const reportContent = document.querySelector(`#${elementId} .printable-document`);
    if (reportContent) {
        document.getElementById('print-area').innerHTML = reportContent.outerHTML;
        setTimeout(() => window.print(), 100);
    } else {
        console.error(`Could not find content to print in #${elementId}`);
        alert("Error: Report content not found.");
    }
};

const findByKey = (array, key, value) => (array || []).find(el => el && String(el[key]) === String(value));

const generateId = (prefix) => `${prefix}-${Date.now()}`;

const printContent = (content) => { 
    document.getElementById('print-area').innerHTML = content; 
    setTimeout(() => window.print(), 200); 
};

function showToast(message, type = 'success') {
    if (type === 'error') Logger.error(`User Toast: ${message}`);
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
}

function setButtonLoading(isLoading, buttonEl) {
    if (!buttonEl) return;
    if (isLoading) {
        buttonEl.disabled = true;
        buttonEl.dataset.originalText = buttonEl.innerHTML;
        buttonEl.innerHTML = `<div class="button-spinner"></div><span>${_t('signing_in')}</span>`;
    } else {
        buttonEl.disabled = false;
        if (buttonEl.dataset.originalText) {
            buttonEl.innerHTML = buttonEl.dataset.originalText;
        }
    }
}

const exportToExcel = (tableId, filename) => { 
    try { 
        const table = document.getElementById(tableId); 
        if (!table) { showToast('Please generate a report first.', 'error'); return; } 
        const wb = XLSX.utils.table_to_book(table, {sheet: "Sheet1"}); 
        XLSX.writeFile(wb, filename); 
        showToast('Exporting to Excel...', 'success'); 
    } catch (err) { 
        showToast('Excel export failed.', 'error'); 
        Logger.error('Export Error:', err); 
    } 
};

const populateOptions = (el, data, ph, valueKey, textKey, textKey2) => { 
    if (!el) { console.warn(`populateOptions failed: element is null for placeholder "${ph}"`); return; }
    el.innerHTML = `<option value="">${ph}</option>`; 
    (data || []).forEach(item => { 
        el.innerHTML += `<option value="${item[valueKey]}">${item[textKey]}${textKey2 && item[textKey2] ? ' (' + item[textKey2] + ')' : ''}</option>`;
    }); 
};