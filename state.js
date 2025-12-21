
// Global State Object
var state = {
    currentUser: null,
    username: null,
    loginCode: null,
    currentLanguage: 'en',
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
    // UI Lists
    currentReceiveList: [],
    currentTransferList: [],
    currentIssueList: [],
    currentPOList: [],
    currentReturnList: [],
    currentRequestList: [],
    currentEditingPOList: [],
    currentAdjustmentList: [],
    // Sets
    modalSelections: new Set(),
    invoiceModalSelections: new Set(),
    reportSelectedBranches: new Set(),
    reportSelectedSections: new Set(),
    reportSelectedItems: new Set(),
    allUsers: [],
    allRoles: [],
    backups: [],
    adminContextPromise: {},
    currentSelectionModal: {
        type: null,
        tempSelections: new Set()
    },
    // Default Pagination State (Overridden by app.js init but good for safety)
    pagination: {
        'table-transaction-history': { page: 1, pageSize: 20 },
        'table-items': { page: 1, pageSize: 20 },
        'table-suppliers': { page: 1, pageSize: 20 },
        'table-activity-log': { page: 1, pageSize: 20 },
        'table-po-viewer': { page: 1, pageSize: 20 },
        'table-my-requests-history': { page: 1, pageSize: 20 }
    }
};

var modalContext = null;
