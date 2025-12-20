async function attemptLogin(username, loginCode) {
    const loginForm = document.getElementById('login-form');
    const loginUsernameInput = document.getElementById('login-username');
    const loginCodeInput = document.getElementById('login-code');
    const loginError = document.getElementById('login-error');
    const loginLoader = document.getElementById('login-loader');
    const appContainer = document.getElementById('app-container');
    const loginContainer = document.getElementById('login-container');

    if (!username || !loginCode) return;
    loginForm.style.display = 'none';
    loginError.textContent = '';
    loginLoader.style.display = 'flex';
    
    try {
        const response = await fetch(`${SCRIPT_URL}?username=${encodeURIComponent(username)}&loginCode=${encodeURIComponent(loginCode)}`);
        if (!response.ok) throw new Error(`Network error: ${response.status} ${response.statusText}`);
        const data = await response.json();
        if (data.status === 'error' || !data.user) {
            throw new Error(data.message || 'Invalid username or login code.');
        }
        if (data.user.isDisabled === true || String(data.user.isDisabled).toUpperCase() === 'TRUE') {
            throw new Error('This user account has been disabled. Please contact an administrator.');
        }
        state.username = username;
        state.loginCode = loginCode;
        state.currentUser = data.user;
        Object.keys(data).forEach(key => {
            if (key !== 'user') state[key] = data[key] || [];
        });
        
        const savedLang = localStorage.getItem('userLanguage') || 'en';
        state.currentLanguage = savedLang;
        document.getElementById('lang-switcher').value = savedLang;

        loginContainer.style.display = 'none';
        appContainer.style.display = 'flex';
        initializeAppUI();
    } catch (error) {
        loginError.textContent = error.message;
        loginLoader.style.display = 'none';
        loginForm.style.display = 'block';
        loginCodeInput.value = '';
        loginUsernameInput.value = '';
    }
}

async function postData(action, data, buttonEl) {
    setButtonLoading(true, buttonEl);
    Logger.debug(`POSTing action: ${action}`, data);
    const { username, loginCode } = state;
    if (!username || !loginCode) {
        showToast(_t('session_error_toast'), 'error');
        setButtonLoading(false, buttonEl);
        return null;
    }

    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            mode: 'cors',
            body: JSON.stringify({ username, loginCode, action, data })
        });
        const result = await response.json();
        if (result.status !== 'success') throw new Error(result.message || 'An unknown error occurred on the server.');
        return result;
    } catch (error) {
        const userMsg = _t('action_failed_toast', {errorMessage: error.message});
        showToast(userMsg, 'error');
        return null;
    } finally {
        setButtonLoading(false, buttonEl);
    }
}