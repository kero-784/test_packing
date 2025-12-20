const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwl6OQvlEMAZdzpL-Xuq9NAWsSFBuZTAXgz4O51GM62HImSQ1bDSaaXEehqiF2phgmx/exec';

const Logger = {
    info: (message, ...args) => console.log(`[StockWise INFO] ${message}`, ...args),
    warn: (message, ...args) => console.warn(`[StockWise WARN] ${message}`, ...args),
    error: (message, ...args) => console.error(`[StockWise ERROR] ${message}`, ...args),
    debug: (message, ...args) => {
        if (state.currentUser && state.currentUser.RoleName === 'Admin') {
            showToast(`DEBUG: ${message}`, 'info');
        }
        console.log(`[StockWise DEBUG] ${message}`, ...args);
    }
};

const userCan = (permission) => {
    if (!state.currentUser || !state.currentUser.permissions) return false;
    const p = state.currentUser.permissions[permission];
    return p === true || String(p).toUpperCase() === 'TRUE';
};