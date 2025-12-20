import { CONFIG, Logger } from './config.js';
import { state } from './state.js';
import { _t } from './i18n.js';

export async function postData(action, data, buttonEl, showToast, setButtonLoading) {
    if (setButtonLoading) setButtonLoading(true, buttonEl);
    Logger.info(`POSTing action: ${action}`, data);
    
    const { username, loginCode } = state;
    if (!username || !loginCode) {
        Logger.error("Authentication token missing.");
        showToast(_t('session_error_toast'), 'error');
        if (setButtonLoading) setButtonLoading(false, buttonEl);
        return null;
    }

    try {
        const response = await fetch(CONFIG.SCRIPT_URL, {
            method: 'POST',
            mode: 'cors',
            body: JSON.stringify({ username, loginCode, action, data })
        });
        const result = await response.json();
        if (result.status !== 'success') throw new Error(result.message || 'Server error.');
        Logger.info(`POST successful for ${action}`, result);
        return result;
    } catch (error) {
        const userMsg = _t('action_failed_toast', {errorMessage: error.message});
        Logger.error(userMsg, error);
        showToast(userMsg, 'error');
        return null;
    } finally {
        if (setButtonLoading) setButtonLoading(false, buttonEl);
    }
}

export async function attemptLogin(username, loginCode, loginUI) {
    const { form, errorEl, loader } = loginUI;
    form.style.display = 'none';
    errorEl.textContent = '';
    loader.style.display = 'flex';
    
    try {
        const response = await fetch(`${CONFIG.SCRIPT_URL}?username=${encodeURIComponent(username)}&loginCode=${encodeURIComponent(loginCode)}`);
        if (!response.ok) throw new Error(`Network error: ${response.status}`);
        const data = await response.json();
        
        if (data.status === 'error' || !data.user) {
            throw new Error(data.message || 'Invalid username or login code.');
        }
        if (data.user.isDisabled === true || String(data.user.isDisabled).toUpperCase() === 'TRUE') {
            throw new Error('User disabled. Contact admin.');
        }

        state.username = username;
        state.loginCode = loginCode;
        state.currentUser = data.user;
        
        Object.keys(data).forEach(key => {
            if (key !== 'user') state[key] = data[key] || [];
        });

        return { success: true };
    } catch (error) {
        Logger.error('Login failed:', error);
        errorEl.textContent = error.message;
        loader.style.display = 'none';
        form.style.display = 'block';
        return { success: false };
    }
}