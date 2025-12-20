export const CONFIG = {
    SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbwl6OQvlEMAZdzpL-Xuq9NAWsSFBuZTAXgz4O51GM62HImSQ1bDSaaXEehqiF2phgmx/exec'
};

export const Logger = {
    info: (m, ...args) => console.log(`[INFO] ${m}`, ...args),
    warn: (m, ...args) => console.warn(`[WARN] ${m}`, ...args),
    error: (m, ...args) => console.error(`[ERROR] ${m}`, ...args)
};