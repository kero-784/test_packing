document.addEventListener('DOMContentLoaded', () => {
    // --- DOM ELEMENT REFERENCES ---
    const loginUsernameInput = document.getElementById('login-username');
    const loginCodeInput = document.getElementById('login-code');
    const loginForm = document.getElementById('login-form');
    const btnLogout = document.getElementById('btn-logout');
    const globalRefreshBtn = document.getElementById('global-refresh-button');
    const mainContent = document.querySelector('.main-content');

    const itemSelectorModal = document.getElementById('item-selector-modal');
    const invoiceSelectorModal = document.getElementById('invoice-selector-modal');
    const editModal = document.getElementById('edit-modal');
    const historyModal = document.getElementById('history-modal');
    const editPOModal = document.getElementById('edit-po-modal');
    const approveRequestModal = document.getElementById('approve-request-modal');
    const selectionModal = document.getElementById('selection-modal');
    
    const modalItemList = document.getElementById('modal-item-list');
    const modalSearchInput = document.getElementById('modal-search-items');
    const editModalBody = document.getElementById('edit-modal-body');
    const editModalTitle = document.getElementById('edit-modal-title');
    const formEditRecord = document.getElementById('form-edit-record');
    const viewTransferModal = document.getElementById('view-transfer-modal');

    // Totalizers for app logic
    window.updateReceiveGrandTotal = () => { let grandTotal = 0; (state.currentReceiveList || []).forEach(item => { grandTotal += (parseFloat(item.quantity) || 0) * (parseFloat(item.cost) || 0); }); document.getElementById('receive-grand-total').textContent = `${grandTotal.toFixed(2)} EGP`; };
    window.updateTransferGrandTotal = () => { let grandTotalQty = 0; (state.currentTransferList || []).forEach(item => { grandTotalQty += (parseFloat(item.quantity) || 0); }); document.getElementById('transfer-grand-total').textContent = grandTotalQty.toFixed(2); };
    window.updateIssueGrandTotal = () => { let grandTotalQty = 0; (state.currentIssueList || []).forEach(item => { grandTotalQty += (parseFloat(item.quantity) || 0); }); document.getElementById('issue-grand-total').textContent = grandTotalQty.toFixed(2); };
    window.updatePOGrandTotal = () => { let grandTotal = 0; (state.currentPOList || []).forEach(item => { grandTotal += (parseFloat(item.quantity) || 0) * (parseFloat(item.cost) || 0); }); document.getElementById('po-grand-total').textContent = `${grandTotal.toFixed(2)} EGP`; };
    window.updatePOEditGrandTotal = () => { let grandTotal = 0; (state.currentEditingPOList || []).forEach(item => { grandTotal += (parseFloat(item.quantity) || 0) * (parseFloat(item.cost) || 0); }); document.getElementById('edit-po-grand-total').textContent = `${grandTotal.toFixed(2)} EGP`; };
    window.updateReturnGrandTotal = () => { let grandTotal = 0; (state.currentReturnList || []).forEach(item => { grandTotal += (parseFloat(item.quantity) || 0) * (parseFloat(item.cost) || 0); }); document.getElementById('return-grand-total').textContent = `${grandTotal.toFixed(2)} EGP`; };

    // View Switching
    window.showView = (viewId, subViewId = null) => {
        Logger.info(`Switching view to: ${viewId}` + (subViewId ? `/${subViewId}` : ''));
        document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));
        document.querySelectorAll('#main-nav a').forEach(link => link.classList.remove('active'));
        const viewToShow = document.getElementById(`view-${viewId}`);
        if(viewToShow) viewToShow.classList.add('active');
        const activeLink = document.querySelector(`[data-view="${viewId}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
            const viewTitleKey = activeLink.querySelector('span').dataset.translateKey;
            document.getElementById('view-title').textContent = _t(viewTitleKey);
            document.getElementById('view-title').dataset.translateKey = viewTitleKey;
        }
        const parentView = document.getElementById(`view-${viewId}`);
        if (parentView) {
            parentView.querySelectorAll('.sub-nav-item').forEach(btn => btn.classList.remove('active'));
            parentView.querySelectorAll('.sub-view').forEach(view => view.classList.remove('active'));
            let targetSubViewId = subViewId;
            if (!targetSubViewId) {
                const firstVisibleTab = parentView.querySelector('.sub-nav-item:not([style*="display: none"])');
                if (firstVisibleTab) targetSubViewId = firstVisibleTab.dataset.subview;
            }
            if (targetSubViewId) {
                const subViewBtn = parentView.querySelector(`[data-subview="${targetSubViewId}"]`);
                if(subViewBtn) subViewBtn.classList.add('active');
                const subViewToShow = parentView.querySelector(`#subview-${targetSubViewId}`);
                if (subViewToShow) subViewToShow.classList.add('active');
            }
        }
        refreshViewData(viewId);
    };

    window.refreshViewData = async (viewId) => {
        if (!state.currentUser) return;
        switch(viewId) {
            case 'dashboard':
                const stock = calculateStockLevels();
                document.getElementById('dashboard-total-items').textContent = (state.items || []).length.toLocaleString();
                document.getElementById('dashboard-total-suppliers').textContent = (state.suppliers || []).length;
                document.getElementById('dashboard-total-branches').textContent = (state.branches || []).length;
                let totalValue = 0;
                Object.values(stock).forEach(bs => Object.values(bs).forEach(i => totalValue += i.quantity * i.avgCost));
                document.getElementById('dashboard-total-value').textContent = `${totalValue.toFixed(2)} EGP`;
                break;
            case 'setup':
                document.getElementById('form-add-item').parentElement.style.display = userCan('createItem') ? 'block' : 'none';
                document.getElementById('form-add-supplier').parentElement.style.display = userCan('createSupplier') ? 'block' : 'none';
                document.getElementById('form-add-branch').parentElement.style.display = userCan('createBranch') ? 'block' : 'none';
                document.getElementById('form-add-section').parentElement.style.display = userCan('createSection') ? 'block' : 'none';
                populateOptions(document.getElementById('item-supplier'), state.suppliers, _t('select_supplier'), 'supplierCode', 'name');
                break;
            case 'backup':
                loadAndRenderBackups();
                loadAutoBackupSettings();
                break;
            case 'master-data':
                renderItemsTable(); renderSuppliersTable(); renderBranchesTable(); renderSectionsTable();
                break;
            case 'operations':
                populateOptions(document.getElementById('receive-supplier'), state.suppliers, _t('select_supplier'), 'supplierCode', 'name');
                populateOptions(document.getElementById('receive-branch'), state.branches, _t('select_a_branch'), 'branchCode', 'branchName');
                populateOptions(document.getElementById('transfer-from-branch'), state.branches, _t('select_a_branch'), 'branchCode', 'branchName');
                populateOptions(document.getElementById('transfer-to-branch'), state.branches, _t('select_a_branch'), 'branchCode', 'branchName');
                populateOptions(document.getElementById('issue-from-branch'), state.branches, _t('select_a_branch'), 'branchCode', 'branchName');
                populateOptions(document.getElementById('issue-to-section'), state.sections, _t('select_a_section'), 'sectionCode', 'sectionName');
                populateOptions(document.getElementById('return-supplier'), state.suppliers, _t('select_supplier'), 'supplierCode', 'name');
                populateOptions(document.getElementById('return-branch'), state.branches, _t('select_a_branch'), 'branchCode', 'branchName');
                populateOptions(document.getElementById('adjustment-branch'), state.branches, _t('select_a_branch'), 'branchCode', 'branchName');
                populateOptions(document.getElementById('fin-adj-supplier'), state.suppliers, _t('select_supplier'), 'supplierCode', 'name');
                const openPOs = (state.purchaseOrders || []).filter(po => po.Status === 'Approved');
                populateOptions(document.getElementById('receive-po-select'), openPOs, _t('select_a_po'), 'poId', 'poId', 'supplierCode');
                document.getElementById('issue-ref').value = generateId('ISN'); document.getElementById('transfer-ref').value = generateId('TRN');
                renderReceiveListTable(); renderIssueListTable(); renderTransferListTable(); renderReturnListTable(); renderPendingTransfers(); renderInTransitReport(); renderAdjustmentListTable();
                break;
            case 'purchasing':
                 populateOptions(document.getElementById('po-supplier'), state.suppliers, _t('select_supplier'), 'supplierCode', 'name');
                 document.getElementById('po-ref').value = generateId('PO');
                 renderPOListTable(); renderPurchaseOrdersViewer(); renderPendingFinancials();
                 break;
            case 'requests':
                renderRequestListTable(); renderMyRequests(); renderPendingRequests();
                break;
            case 'payments':
                populateOptions(document.getElementById('payment-supplier-select'), state.suppliers, _t('select_supplier'), 'supplierCode', 'name');
                renderPaymentList();
                break;
            case 'reports':
                populateOptions(document.getElementById('supplier-statement-select'), state.suppliers, _t('select_a_supplier'), 'supplierCode', 'name');
                break;
            case 'stock-levels':
                renderItemCentricStockView();
                break;
            case 'transaction-history': 
                populateOptions(document.getElementById('tx-filter-branch'), state.branches, _t('all_branches'), 'branchCode', 'branchName');
                const txTypes = ['receive', 'issue', 'transfer_out', 'transfer_in', 'return_out', 'po', 'adjustment_in', 'adjustment_out'];
                const txTypeOptions = txTypes.map(t => ({'type': t, 'name': _t(t.replace(/_/g,''))}));
                populateOptions(document.getElementById('tx-filter-type'), txTypeOptions, _t('all_types'), 'type', 'name');
                renderTransactionHistory(); 
                break;
            case 'user-management':
                const result = await postData('getAllUsersAndRoles', {}, null);
                if (result) { state.allUsers = result.data.users; state.allRoles = result.data.roles; renderUserManagementUI(); }
                break;
            case 'activity-log':
                renderActivityLog();
                break;
        }
        applyUserUIConstraints();
        applyTranslations();
    };

    window.reloadDataAndRefreshUI = async () => { 
        setButtonLoading(true, globalRefreshBtn); 
        try { 
            const response = await fetch(`${SCRIPT_URL}?username=${encodeURIComponent(state.username)}&loginCode=${encodeURIComponent(state.loginCode)}`); 
            const data = await response.json(); 
            Object.keys(data).forEach(key => { if(key !== 'user') state[key] = data[key] || state[key]; }); 
            updateUserBranchDisplay(); updatePendingRequestsWidget(); 
            const currentView = document.querySelector('.nav-item a.active')?.dataset.view || 'dashboard'; 
            await refreshViewData(currentView); 
            showToast(_t('data_refreshed_toast'), 'success'); 
        } catch (err) { showToast(_t('data_refresh_fail_toast'), 'error'); } 
        finally { setButtonLoading(false, globalRefreshBtn); } 
    };

    window.initializeAppUI = () => {
        setupRoleBasedNav();
        attachEventListeners();
        attachSubNavListeners(); 
        const firstVisibleView = document.querySelector('#main-nav .nav-item:not([style*="display: none"]) a')?.dataset.view || 'dashboard';
        showView(firstVisibleView);
    };

    // Initialization logic
    applyTranslations();
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        attemptLogin(document.getElementById('login-username').value.trim(), document.getElementById('login-code').value);
    });

    function attachEventListeners() {
        btnLogout.addEventListener('click', () => location.reload());
        globalRefreshBtn.addEventListener('click', reloadDataAndRefreshUI);
        mainContent.addEventListener('click', handleMainContentClicks);
        document.body.addEventListener('click', handleGlobalClicks);
        document.getElementById('btn-confirm-modal-selection').addEventListener('click', confirmModalSelection);
        // ... include other logic from original script PART 4
    }

    function handleMainContentClicks(e) {
        const btn = e.target.closest('button');
        if (!btn) return;
        if (btn.dataset.context) { openItemSelectorModal(e); }
        // ... (remaining handlers from original handleEventListeners)
    }

    function handleGlobalClicks(e) {
        if (e.target.classList.contains('close-button') || e.target.classList.contains('modal-cancel')) { closeModal(); } 
        // ... (remaining handlers from original handleGlobalClicks)
    }

    // Modal/Rendering Logic (Placeholders replaced with original logic)
    function openItemSelectorModal(event) {
        const context = event.target.dataset.context;
        modalContext = context;
        let currentList = [];
        switch (context) {
            case 'receive': currentList = state.currentReceiveList; break;
            case 'transfer': currentList = state.currentTransferList; break;
            case 'issue': currentList = state.currentIssueList; break;
            case 'po': currentList = state.currentPOList; break;
            case 'return': currentList = state.currentReturnList; break;
            case 'request': currentList = state.currentRequestList; break;
            case 'edit-po': currentList = state.currentEditingPOList; break;
            case 'adjustment': currentList = state.currentAdjustmentList; break;
        }
        state.modalSelections = new Set((currentList || []).map(item => item.itemCode));
        renderItemsInModal();
        itemSelectorModal.classList.add('active');
    }

    function closeModal() {
        document.querySelectorAll('.modal-overlay').forEach(modal => modal.classList.remove('active'));
    }

    function renderItemsInModal(filter = '') {
        modalItemList.innerHTML = '';
        const lowercasedFilter = filter.toLowerCase();
        state.items.filter(item => item.name.toLowerCase().includes(lowercasedFilter) || item.code.toLowerCase().includes(lowercasedFilter)).forEach(item => {
            const isChecked = state.modalSelections.has(item.code);
            const itemDiv = document.createElement('div');
            itemDiv.className = 'modal-item';
            itemDiv.innerHTML = `<input type="checkbox" id="modal-item-${item.code}" data-code="${item.code}" ${isChecked ? 'checked' : ''}><label for="modal-item-${item.code}"><strong>${item.name}</strong><br><small style="color:var(--text-light-color)">${_t('table_h_code')}: ${item.code}</small></label>`;
            modalItemList.appendChild(itemDiv);
        });
    }

    function confirmModalSelection() {
        const createNewList = (currentList) => {
            const newList = [];
            state.modalSelections.forEach(code => {
                const item = findByKey(state.items, 'code', code);
                const existing = (currentList || []).find(i => i.itemCode === code);
                newList.push(existing || { itemCode: item.code, itemName: item.name, quantity: '', cost: item.cost });
            });
            return newList;
        };
        switch (modalContext) {
            case 'receive': state.currentReceiveList = createNewList(state.currentReceiveList); renderReceiveListTable(); break;
            case 'transfer': state.currentTransferList = createNewList(state.currentTransferList); renderTransferListTable(); break;
            case 'issue': state.currentIssueList = createNewList(state.currentIssueList); renderIssueListTable(); break;
            case 'po': state.currentPOList = createNewList(state.currentPOList); renderPOListTable(); break;
            case 'return': state.currentReturnList = createNewList(state.currentReturnList); renderReturnListTable(); break;
            case 'request': state.currentRequestList = createNewList(state.currentRequestList); renderRequestListTable(); break;
            case 'edit-po': state.currentEditingPOList = createNewList(state.currentEditingPOList); renderPOEditListTable(); break;
            case 'adjustment': state.currentAdjustmentList = createNewList(state.currentAdjustmentList); renderAdjustmentListTable(); break;
        }
        closeModal();
    }
});