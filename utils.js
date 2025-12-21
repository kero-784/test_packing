

window.printReport = function(elementId) {
    // Find the specific content we want to print
    // Tries to find a specific printable class, or falls back to the container
    const reportContent = document.querySelector(`#${elementId} .printable-document`) || 
                          document.querySelector(`#${elementId} .report-area table`)?.parentElement ||
                          document.getElementById(elementId);

    if (reportContent) {
        const printArea = document.getElementById('print-area');
        printArea.innerHTML = '';
        
        // If it's just a table or raw content, wrap it for styling
        if(reportContent.tagName === 'TABLE' || reportContent.classList.contains('report-area')) {
             const wrapper = document.createElement('div');
             wrapper.className = 'printable-document card';
             // Clone deep to get all children including inputs/values
             wrapper.appendChild(reportContent.cloneNode(true));
             printArea.appendChild(wrapper);
        } else {
             printArea.appendChild(reportContent.cloneNode(true));
        }

        // Small delay to ensure styles render before print dialog
        setTimeout(() => window.print(), 200);
    } else {
        console.error(`Could not find content to print in #${elementId}`);
        alert("Error: Report content not found.");
    }
};

function findByKey(array, key, value) {
    return (array || []).find(el => el && String(el[key]) === String(value));
}

function generateId(prefix) {
    return `${prefix}-${Date.now()}`;
}

function printContent(content) { 
    document.getElementById('print-area').innerHTML = content; 
    setTimeout(() => window.print(), 200); 
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

// Updated to accept custom loading text
function setButtonLoading(isLoading, buttonEl, loadingText = 'Loading...') {
    if (!buttonEl) return;
    
    if (isLoading) {
        buttonEl.disabled = true;
        // Save original text to restore later
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
