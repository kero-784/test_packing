

// Global State Object
var state = {
    currentUser: null,
    username: null,
    loginCode: null,
    currentLanguage: 'en',
    
    // Core Data
    companySettings: {}, // Holds company name, address, logo, etc.
    items: [],
    suppliers: [],
    branches: [],
    sections: [],
    transactions: [],
    payments: [],
    purchaseOrders: [],
    purchaseOrderItems: [],
    itemRequests: [],
    activityLog: [],
    
    // UI Transaction Buffers
    currentReceiveList: [],
    currentTransferList: [],
    currentIssueList: [],
    currentPOList: [],
    currentReturnList: [],
    currentRequestList: [],
    currentEditingPOList: [],
    currentAdjustmentList: [],
    
    // Selection Sets
    modalSelections: new Set(),
    invoiceModalSelections: new Set(),
    reportSelectedBranches: new Set(),
    reportSelectedSections: new Set(),
    reportSelectedItems: new Set(),
    
    // Admin Data
    allUsers: [],
    allRoles: [],
    backups: [],
    
    // Async Control
    adminContextPromise: {},
    
    // Active Selection Modal Context
    currentSelectionModal: {
        type: null,
        tempSelections: new Set()
    },
    
    // Pagination Configuration
    pagination: {
        'table-transaction-history': { page: 1, pageSize: 20 },
        'table-items': { page: 1, pageSize: 20 },
        'table-suppliers': { page: 1, pageSize: 20 },
        'table-activity-log': { page: 1, pageSize: 20 },
        'table-po-viewer': { page: 1, pageSize: 20 },
        'table-my-requests-history': { page: 1, pageSize: 20 },
        'table-stock-adj-report': { page: 1, pageSize: 20 },
        'table-supplier-adj-report': { page: 1, pageSize: 20 }
    }
};

var modalContext = null;
