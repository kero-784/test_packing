import { state, modalContext } from './state.js';
import { _t, applyTranslations } from './i18n.js';
import { Logger } from './config.js';

export function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
}

export function setButtonLoading(isLoading, buttonEl) {
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

export function closeModal() {
    document.querySelectorAll('.modal-overlay').forEach(modal => modal.classList.remove('active'));
    const modalSearchInput = document.getElementById('modal-search-items');
    if(modalSearchInput) modalSearchInput.value = '';
    modalContext.value = null;
}

export function showView(viewId, subViewId = null, refreshFn) {
    Logger.info(`Switching view to: ${viewId}`);
    
    document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));
    document.querySelectorAll('#main-nav a').forEach(link => link.classList.remove('active'));

    const viewToShow = document.getElementById(`view-${viewId}`);
    if(viewToShow) viewToShow.classList.add('active');
    
    const activeLink = document.querySelector(`[data-view="${viewId}"]`);
    if (activeLink) {
        activeLink.classList.add('active');
        const viewTitleKey = activeLink.querySelector('span').dataset.translateKey;
        document.getElementById('view-title').textContent = _t(viewTitleKey);
    }

    if (viewToShow) {
        viewToShow.querySelectorAll('.sub-nav-item').forEach(btn => btn.classList.remove('active'));
        viewToShow.querySelectorAll('.sub-view').forEach(view => view.classList.remove('active'));

        let targetSubViewId = subViewId;
        if (!targetSubViewId) {
            const firstVisibleTab = viewToShow.querySelector('.sub-nav-item:not([style*="display: none"])');
            if (firstVisibleTab) targetSubViewId = firstVisibleTab.dataset.subview;
        }
        
        if (targetSubViewId) {
            const subViewBtn = viewToShow.querySelector(`[data-subview="${targetSubViewId}"]`);
            if(subViewBtn) subViewBtn.classList.add('active');
            const subViewToShow = viewToShow.querySelector(`#subview-${targetSubViewId}`);
            if (subViewToShow) subViewToShow.classList.add('active');
        }
    }
    
    if(refreshFn) refreshFn(viewId);
}