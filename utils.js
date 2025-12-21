



window.printReport = function(elementId) {
    // Find the specific content we want to print
    const reportContent = document.querySelector(`#${elementId} .printable-document`) || 
                          document.querySelector(`#${elementId} .report-area table`)?.parentElement ||
                          document.getElementById(elementId);

    if (reportContent) {
        const printArea = document.getElementById('print-area');
        printArea.innerHTML = '';
        
        // Clone the node deeply
        const contentClone = reportContent.cloneNode(true);
        
        // If it's a raw table or report area, wrap it to match styles
        if(contentClone.tagName === 'TABLE' || contentClone.classList.contains('report-area')) {
             const wrapper = document.createElement('div');
             wrapper.className = 'printable-document card';
             wrapper.style.border = 'none'; // Clean for print
             wrapper.style.boxShadow = 'none';
             wrapper.appendChild(contentClone);
             printArea.appendChild(wrapper);
        } else {
             // Ensure it has the class for styling if missing
             if (!contentClone.classList.contains('printable-document')) {
                 contentClone.classList.add('printable-document');
             }
             printArea.appendChild(contentClone);
        }

        // Delay to allow DOM update before opening print dialog
        setTimeout(() => window.print(), 500);
    } else {
        console.error(`Could not find content to print in #${elementId}`);
        showToast("Error: Report content not found.", "error");
    }
};

function findByKey(array, key, value) {
    return (array || []).find(el => el && String(el[key]) === String(value));
}

function generateId(prefix) {
    return `${prefix}-${Date.now()}`;
}

function printContent(content) { 
    const printArea = document.getElementById('print-area');
    printArea.innerHTML = content; 
    setTimeout(() => window.print(), 500); 
}

function showToast(message, type = 'success') {
    if (type === 'error') Logger.error(`User Toast: ${message}`);
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    container.appendChild(toast);
    
    // Remove after 3.5 seconds
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// Helper to change button text/state during async operations
function setButtonLoading(isLoading, buttonEl, loadingText = 'Loading...') {
    if (!buttonEl) return;
    
    if (isLoading) {
        buttonEl.disabled = true;
        // Save original text to restore later, only if not already saved
        if (!buttonEl.dataset.originalText) {
            buttonEl.dataset.originalText = buttonEl.innerHTML;
        }
        buttonEl.innerHTML = `<div class="button-spinner"></div><span>${loadingText}</span>`;
    } else {
        buttonEl.disabled = false;
        if (buttonEl.dataset.originalText) {
            buttonEl.innerHTML = buttonEl.dataset.originalText;
        }
    }
}

function exportToExcel(tableId, filename) { 
    try { 
        const table = document.getElementById(tableId); 
        if (!table) { showToast('Please generate a report first.', 'error'); return; } 
        
        // Use SheetJS to convert table to workbook
        const wb = XLSX.utils.table_to_book(table, {sheet: "Sheet1"}); 
        XLSX.writeFile(wb, filename); 
        
        showToast('Exporting to Excel...', 'success'); 
    } catch (err) { 
        showToast('Excel export failed.', 'error'); 
        Logger.error('Export Error:', err); 
    } 
}

function populateOptions(el, data, ph, valueKey, textKey, textKey2) { 
    if (!el) { console.warn(`populateOptions failed: element is null for placeholder "${ph}"`); return; }
    
    let html = `<option value="">${ph}</option>`; 
    (data || []).forEach(item => { 
        const text = textKey2 && item[textKey2] 
            ? `${item[textKey]} (${item[textKey2]})` 
            : item[textKey];
        html += `<option value="${item[valueKey]}">${text}</option>`;
    }); 
    el.innerHTML = html;
}
