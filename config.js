// config.js
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwjJwh-HrwQHPGi1-1LZPtBxukGLaYzkm5K-RVXtkBlV19vzBY2BJ2Xc6I1s1gXqjV5/exec';

const Logger = {
    info: (message, ...args) => console.log(`%c[INFO] ${message}`, 'color: #2196F3; font-weight: bold;', ...args),
    warn: (message, ...args) => console.warn(`%c[WARN] ${message}`, 'color: #FF9800; font-weight: bold;', ...args),
    error: (message, ...args) => console.error(`%c[ERROR] ${message}`, 'color: #F44336; font-weight: bold;', ...args),
    debug: (message, ...args) => {
        // Always log debug for now to help troubleshoot
        console.log(`%c[DEBUG] ${message}`, 'color: #9C27B0;', ...args);
    }
};

function userCan(permission) {
    if (!state.currentUser || !state.currentUser.permissions) return false;
    const p = state.currentUser.permissions[permission];
    return p === true || String(p).toUpperCase() === 'TRUE';
}
