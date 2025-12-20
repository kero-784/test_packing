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
};

var modalContext = null;
