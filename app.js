document.addEventListener('DOMContentLoaded', () => {
    // --- DOM ELEMENT REFERENCES ---
    const loginUsernameInput = document.getElementById('login-username');
    const loginCodeInput = document.getElementById('login-code');
    const loginForm = document.getElementById('login-form');
    const btnLogout = document.getElementById('btn-logout');
    const globalRefreshBtn = document.getElementById('global-refresh-button');
    const mainContent = document.querySelector('.main-content');

    // Modals
    const itemSelectorModal = document.getElementById('item-selector-modal');
    const invoiceSelectorModal = document.getElementById('invoice-selector-modal');
    const editModal = document.getElementById('edit-modal');
    const historyModal = document.getElementById('history-modal');
    const editPOModal = document.getElementById('edit-po-modal');
    const approveRequestModal = document.getElementById('approve-request-modal');
    const selectionModal = document.getElementById('selection-modal');
    const viewTransferModal = document.getElementById('view-transfer-modal');
    const restoreModal = document.getElementById('restore-modal');
    const contextModal = document.getElementById('context-selector-modal');

    const modalItemList = document.getElementById('modal-item-list');
    const modalSearchInput = document.getElementById('modal-search-items');
    const editModalBody = document.getElementById('edit-modal-body');
    const editModalTitle = document.getElementById('edit-modal-title');
    const formEditRecord = document.getElementById('form-edit-record');

    // --- GLOBAL HELPERS (Required by ui-renderers.js) ---
    window.updateReceiveGrandTotal = () => { let grandTotal = 0; (state.currentReceiveList || []).forEach(item => { grandTotal += (parseFloat(item.quantity) || 0) * (parseFloat(item.cost) || 0); }); const el = document.getElementById('receive-grand-total'); if(el) el.textContent = `${grandTotal.toFixed(2)} EGP`; };
    window.updateTransferGrandTotal = () => { let grandTotalQty = 0; (state.currentTransferList || []).forEach(item => { grandTotalQty += (parseFloat(item.quantity) || 0); }); const el = document.getElementById('transfer-grand-total'); if(el) el.textContent = grandTotalQty.toFixed(2); };
    window.updateIssueGrandTotal = () => { let grandTotalQty = 0; (state.currentIssueList || []).forEach(item => { grandTotalQty += (parseFloat(item.quantity) || 0); }); const el = document.getElementById('issue-grand-total'); if(el) el.textContent = grandTotalQty.toFixed(2); };
    window.updatePOGrandTotal = () => { let grandTotal = 0; (state.currentPOList || []).forEach(item => { grandTotal += (parseFloat(item.quantity) || 0) * (parseFloat(item.cost) || 0); }); const el = document.getElementById('po-grand-total'); if(el) el.textContent = `${grandTotal.toFixed(2)} EGP`; };
    window.updatePOEditGrandTotal = () => { let grandTotal = 0; (state.currentEditingPOList || []).forEach(item => { grandTotal += (parseFloat(item.quantity) || 0) * (parseFloat(item.cost) || 0); }); const el = document.getElementById('edit-po-grand-total'); if(el) el.textContent = `${grandTotal.toFixed(2)} EGP`; };
    window.updateReturnGrandTotal = () => { let grandTotal = 0; (state.currentReturnList || []).forEach(item => { grandTotal += (parseFloat(item.quantity) || 0) * (parseFloat(item.cost) || 0); }); const el = document.getElementById('return-grand-total'); if(el) el.textContent = `${grandTotal.toFixed(2)} EGP`; };

    // --- CORE INITIALIZATION ---
    function init() {
        const langSwitcher = document.getElementById('lang-switcher');
        const savedLang = localStorage.getItem('userLanguage') || 'en';
        state.currentLanguage = savedLang;
        if(langSwitcher) langSwitcher.value = savedLang;
        applyTranslations();
        
        if(langSwitcher) {
            langSwitcher.addEventListener('change', e => {
                const selectedLang = e.target.value;
                localStorage.setItem('userLanguage', selectedLang);
                state.currentLanguage = selectedLang;
                reloadDataAndRefreshUI();
            });
        }

        const loginContainer = document.getElementById('login-container');
        const appContainer = document.getElementById('app-container');
        if(loginContainer) loginContainer.style.display = 'flex';
        if(appContainer) appContainer.style.display = 'none';
        
        if(loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const username = loginUsernameInput.value.trim();
                const code = loginCodeInput.value;
                if (username && code) {
                    attemptLogin(username, code);
                }
            });
        }
    }

    // --- MAIN UI SETUP (Called after successful login) ---
    window.initializeAppUI = () => {
        Logger.info('Initializing App UI...');
        setupRoleBasedNav();
        attachEventListeners();
        attachSubNavListeners(); 
        
        const firstVisibleView = document.querySelector('#main-nav .nav-item:not([style*="display: none"]) a')?.dataset.view || 'dashboard';
        showView(firstVisibleView);
        
        updateUserBranchDisplay();
        updatePendingRequestsWidget();
    };

    // --- NAVIGATION LOGIC ---
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
            let targetSubViewId = subViewId;
            // If no specific subview requested, find the first available one in the markup
            if (!targetSubViewId) {
                const firstVisibleTab = parentView.querySelector('.sub-nav-item:not([style*="display: none"])');
                if (firstVisibleTab) targetSubViewId = firstVisibleTab.dataset.subview;
            }
            
            if (targetSubViewId) {
                parentView.querySelectorAll('.sub-nav-item').forEach(btn => btn.classList.remove('active'));
                parentView.querySelectorAll('.sub-view').forEach(view => view.classList.remove('active'));

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
        Logger.debug(`Refreshing view data: ${viewId}`);

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
                
                if(document.getElementById('issue-ref')) document.getElementById('issue-ref').value = generateId('ISN'); 
                if(document.getElementById('transfer-ref')) document.getElementById('transfer-ref').value = generateId('TRN');
                
                renderReceiveListTable(); renderIssueListTable(); renderTransferListTable(); renderReturnListTable(); 
                renderPendingTransfers(); renderInTransitReport(); renderAdjustmentListTable();
                break;
            case 'purchasing':
                 populateOptions(document.getElementById('po-supplier'), state.suppliers, _t('select_supplier'), 'supplierCode', 'name');
                 if(document.getElementById('po-ref')) document.getElementById('po-ref').value = generateId('PO');
                 renderPOListTable(); renderPurchaseOrdersViewer(); renderPendingFinancials();
                 break;
            case 'requests':
                renderRequestListTable(); renderMyRequests(); renderPendingRequests();
                break;
            case 'payments':
                populateOptions(document.getElementById('payment-supplier-select'), state.suppliers, _t('select_supplier'), 'supplierCode', 'name');
                renderPaymentList();
                const btnInv = document.getElementById('btn-select-invoices');
                if(btnInv) btnInv.disabled = true;
                break;
            case 'reports':
                populateOptions(document.getElementById('supplier-statement-select'), state.suppliers, _t('select_a_supplier'), 'supplierCode', 'name');
                const branchCount = document.getElementById('consumption-branch-count');
                if(branchCount) branchCount.textContent = `${state.reportSelectedBranches.size} selected`;
                const sectionCount = document.getElementById('consumption-section-count');
                if(sectionCount) sectionCount.textContent = `${state.reportSelectedSections.size} selected`;
                const itemCount = document.getElementById('consumption-item-count');
                if(itemCount) itemCount.textContent = `${state.reportSelectedItems.size} selected`;
                break;
            case 'stock-levels':
                document.getElementById('stock-levels-title').textContent = userCan('viewAllBranches') ? _t('stock_by_item_all_branches') : _t('stock_by_item_your_branch');
                renderItemCentricStockView();
                break;
            case 'transaction-history': 
                populateOptions(document.getElementById('tx-filter-branch'), state.branches, _t('all_branches'), 'branchCode', 'branchName');
                const txTypes = ['receive', 'issue', 'transfer_out', 'transfer_in', 'return_out', 'po', 'adjustment_in', 'adjustment_out'];
                const txTypeOptions = txTypes.map(t => ({'type': t, 'name': _t(t.replace(/_/g,''))}));
                populateOptions(document.getElementById('tx-filter-type'), txTypeOptions, _t('all_types'), 'type', 'name');
                
                renderTransactionHistory({
                    startDate: document.getElementById('tx-filter-start-date')?.value,
                    endDate: document.getElementById('tx-filter-end-date')?.value,
                    type: document.getElementById('tx-filter-type')?.value,
                    branch: document.getElementById('tx-filter-branch')?.value,
                    searchTerm: document.getElementById('transaction-search')?.value
                }); 
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
        Logger.info('Reloading data...'); 
        const { username, loginCode } = state; 
        if (!username || !loginCode) return; 
        
        setButtonLoading(true, globalRefreshBtn); 
        try { 
            const response = await fetch(`${SCRIPT_URL}?username=${encodeURIComponent(username)}&loginCode=${encodeURIComponent(loginCode)}`); 
            if (!response.ok) throw new Error('Failed to reload data.'); 
            const data = await response.json(); 
            if (data.status === 'error') throw new Error(data.message); 
            
            Object.keys(data).forEach(key => { 
                if(key !== 'user') state[key] = data[key] || state[key]; 
            }); 
            
            updateUserBranchDisplay(); 
            updatePendingRequestsWidget(); 
            
            const currentView = document.querySelector('.nav-item a.active')?.dataset.view || 'dashboard'; 
            await refreshViewData(currentView); 
            showToast(_t('data_refreshed_toast'), 'success'); 
        } catch (err) { 
            Logger.error('Data reload failed:', err); 
            showToast(_t('data_refresh_fail_toast'), 'error'); 
        } finally { 
            setButtonLoading(false, globalRefreshBtn); 
        } 
    };

    // --- EVENT LISTENER ATTACHMENT ---
    function attachEventListeners() {
        btnLogout.addEventListener('click', (e) => { e.preventDefault(); location.reload(); });
        globalRefreshBtn.addEventListener('click', reloadDataAndRefreshUI);
        
        document.querySelectorAll('#main-nav a:not(#btn-logout)').forEach(link => {
            link.addEventListener('click', e => {
                e.preventDefault();
                const viewId = link.dataset.view;
                showView(viewId);
            });
        });

        document.body.addEventListener('click', handleGlobalClicks);
        mainContent.addEventListener('click', handleMainContentClicks);

        attachFormListeners();

        setupSearch('search-items', renderItemsTable, 'items', ['name', 'code', 'category']);
        setupSearch('search-suppliers', renderSuppliersTable, 'suppliers', ['name', 'supplierCode']);
        setupSearch('search-branches', renderBranchesTable, 'branches', ['branchName', 'branchCode']);
        setupSearch('search-sections', renderSectionsTable, 'sections', ['sectionName', 'sectionCode']);
        setupSearch('stock-levels-search', renderItemCentricStockView, 'items', ['name', 'code']);
        
        if(document.getElementById('item-inquiry-search')) {
            document.getElementById('item-inquiry-search').addEventListener('input', e => renderItemInquiry(e.target.value.toLowerCase()));
        }

        document.getElementById('btn-export-items').addEventListener('click', () => exportToExcel('table-items', 'ItemList.xlsx'));
        document.getElementById('btn-export-suppliers').addEventListener('click', () => exportToExcel('table-suppliers', 'SupplierList.xlsx'));
        document.getElementById('btn-export-branches').addEventListener('click', () => exportToExcel('table-branches', 'BranchList.xlsx'));
        document.getElementById('btn-export-sections').addEventListener('click', () => exportToExcel('table-sections', 'SectionList.xlsx'));
        document.getElementById('btn-export-stock').addEventListener('click', () => exportToExcel('table-stock-levels-by-item', 'StockLevels.xlsx'));
        document.getElementById('btn-export-supplier-statement').addEventListener('click', () => exportToExcel('table-supplier-statement-report', 'SupplierStatement.xlsx'));
        document.getElementById('btn-export-consumption-report').addEventListener('click', () => exportToExcel('table-consumption-report', 'ConsumptionReport.xlsx'));

        document.getElementById('btn-confirm-modal-selection').addEventListener('click', confirmModalSelection);
        document.getElementById('btn-confirm-invoice-selection').addEventListener('click', confirmModalSelection);
        document.getElementById('invoice-selector-modal').addEventListener('change', handleInvoiceModalCheckboxChange);
        modalItemList.addEventListener('change', handleModalCheckboxChange);
        modalSearchInput.addEventListener('input', e => renderItemsInModal(e.target.value)); 
        formEditRecord.addEventListener('submit', handleUpdateSubmit);

        document.getElementById('auto-backup-toggle').addEventListener('change', handleAutoBackupToggle);
        document.getElementById('auto-backup-frequency').addEventListener('change', handleAutoBackupToggle);
        document.getElementById('btn-create-backup').addEventListener('click', async (e) => {
            const btn = e.currentTarget;
            if (confirm(_t('backup_confirm_prompt'))) {
                const result = await postData('createBackup', {}, btn);
                if (result && result.data) {
                    showToast(_t('backup_created_toast', {fileName: result.data.fileName}), 'success');
                    await loadAndRenderBackups();
                }
            }
        });
        document.getElementById('backup-list-container').addEventListener('click', (e) => {
            const btn = e.target.closest('button');
            if (btn && btn.classList.contains('btn-restore')) {
                const backupFileId = findByKey(state.backups, 'url', btn.dataset.url)?.id;
                const backupFileName = findByKey(state.backups, 'url', btn.dataset.url)?.name;
                if (backupFileId) openRestoreModal(backupFileId, backupFileName);
            }
        });
        document.getElementById('btn-confirm-restore').addEventListener('click', handleConfirmRestore);

        document.getElementById('btn-confirm-context').addEventListener('click', confirmContextSelection);
        
        document.getElementById('btn-confirm-report-selection').addEventListener('click', confirmReportSelection);
        document.getElementById('selection-modal-search').addEventListener('input', e => renderSelectionModalContent(e.target.value));
        document.getElementById('selection-modal-list').addEventListener('change', e => {
            if (e.target.type === 'checkbox') {
                if (e.target.checked) state.currentSelectionModal.tempSelections.add(e.target.dataset.id);
                else state.currentSelectionModal.tempSelections.delete(e.target.dataset.id);
            }
        });
        
        ['tx-filter-start-date', 'tx-filter-end-date', 'tx-filter-type', 'tx-filter-branch', 'transaction-search'].forEach(id => {
            const el = document.getElementById(id);
            if(el) {
                const eventType = (el.tagName === 'SELECT' || el.type === 'date') ? 'change' : 'input';
                el.addEventListener(eventType, () => {
                    renderTransactionHistory({
                        startDate: document.getElementById('tx-filter-start-date').value,
                        endDate: document.getElementById('tx-filter-end-date').value,
                        type: document.getElementById('tx-filter-type').value,
                        branch: document.getElementById('tx-filter-branch').value,
                        searchTerm: document.getElementById('transaction-search').value
                    });
                });
            }
        });
    }

    function attachSubNavListeners() { 
        document.querySelectorAll('.sub-nav').forEach(nav => { 
            if(nav.closest('#history-modal')) return;
            nav.addEventListener('click', e => { 
                if (!e.target.classList.contains('sub-nav-item')) return; 
                const subviewId = e.target.dataset.subview; 
                const parentView = e.target.closest('.view'); 
                if (!parentView) return; 
                parentView.querySelectorAll('.sub-nav-item').forEach(btn => btn.classList.remove('active')); 
                e.target.classList.add('active'); 
                parentView.querySelectorAll('.sub-view').forEach(view => view.classList.remove('active')); 
                const subViewToShow = parentView.querySelector(`#subview-${subviewId}`); 
                if (subViewToShow) subViewToShow.classList.add('active'); 
                refreshViewData(parentView.id.replace('view-','')); 
            }); 
        }); 
    }

    // --- FORM HANDLERS ---
    function attachFormListeners() {
        document.getElementById('form-add-item').addEventListener('submit', async e => { e.preventDefault(); const btn = e.target.querySelector('button[type="submit"]'); const data = { code: document.getElementById('item-code').value, barcode: document.getElementById('item-barcode').value, name: document.getElementById('item-name').value, unit: document.getElementById('item-unit').value, category: document.getElementById('item-category').value, supplierCode: document.getElementById('item-supplier').value, cost: parseFloat(document.getElementById('item-cost').value) }; const result = await postData('addItem', data, btn); if (result) { showToast(_t('add_success_toast', {type: _t('item')}), 'success'); e.target.reset(); reloadDataAndRefreshUI(); } });
        document.getElementById('form-add-supplier').addEventListener('submit', async e => { e.preventDefault(); const btn = e.target.querySelector('button[type="submit"]'); const data = { supplierCode: document.getElementById('supplier-code').value, name: document.getElementById('supplier-name').value, contact: document.getElementById('supplier-contact').value }; const result = await postData('addSupplier', data, btn); if (result) { showToast(_t('add_success_toast', {type: _t('supplier')}), 'success'); e.target.reset(); reloadDataAndRefreshUI(); } });
        document.getElementById('form-add-branch').addEventListener('submit', async e => { e.preventDefault(); const btn = e.target.querySelector('button[type="submit"]'); const data = { branchCode: document.getElementById('branch-code').value, branchName: document.getElementById('branch-name').value }; const result = await postData('addBranch', data, btn); if (result) { showToast(_t('add_success_toast', {type: _t('branch')}), 'success'); e.target.reset(); reloadDataAndRefreshUI(); } });
        document.getElementById('form-add-section').addEventListener('submit', async e => { e.preventDefault(); const btn = e.target.querySelector('button[type="submit"]'); const data = { sectionCode: document.getElementById('section-code').value, sectionName: document.getElementById('section-name').value }; const result = await postData('addSection', data, btn); if (result) { showToast(_t('add_success_toast', {type: _t('section')}), 'success'); e.target.reset(); reloadDataAndRefreshUI(); } });
        
        document.getElementById('btn-submit-receive-batch').addEventListener('click', async (e) => { const btn = e.currentTarget; let branchCode = document.getElementById('receive-branch').value; const supplierCode = document.getElementById('receive-supplier').value, invoiceNumber = document.getElementById('receive-invoice').value, notes = document.getElementById('receive-notes').value, poId = document.getElementById('receive-po-select').value; if(userCan('viewAllBranches') && !state.currentUser.AssignedBranchCode) { const context = await requestAdminContext({ branch: true }); if(!context) return; branchCode = context.branch; } if (!userCan('opReceiveWithoutPO') && !poId) { showToast(_t('select_po_first_toast'), 'error'); return; } if (!supplierCode || !branchCode || !invoiceNumber || state.currentReceiveList.length === 0) { showToast(_t('fill_required_fields_toast'), 'error'); return; } const payload = { type: 'receive', batchId: `GRN-${Date.now()}`, supplierCode, branchCode, invoiceNumber, poId, date: new Date().toISOString(), items: state.currentReceiveList.map(i => ({...i, type: 'receive'})), notes }; await handleTransactionSubmit(payload, btn); });
        document.getElementById('btn-submit-transfer-batch').addEventListener('click', async (e) => { const btn = e.currentTarget; let fromBranchCode = document.getElementById('transfer-from-branch').value, toBranchCode = document.getElementById('transfer-to-branch').value; const notes = document.getElementById('transfer-notes').value, ref = document.getElementById('transfer-ref').value; if(userCan('viewAllBranches') && !state.currentUser.AssignedBranchCode) { const context = await requestAdminContext({ fromBranch: true, toBranch: true }); if(!context) return; fromBranchCode = context.fromBranch; toBranchCode = context.toBranch; } if (!fromBranchCode || !toBranchCode || fromBranchCode === toBranchCode || state.currentTransferList.length === 0) { showToast('Please select valid branches and add at least one item.', 'error'); return; } const payload = { type: 'transfer_out', batchId: ref, ref: ref, fromBranchCode, toBranchCode, date: new Date().toISOString(), items: state.currentTransferList.map(i => ({...i, type: 'transfer_out'})), notes }; await handleTransactionSubmit(payload, btn); });
        document.getElementById('btn-submit-issue-batch').addEventListener('click', async(e) => { const btn = e.currentTarget; let fromBranchCode = document.getElementById('issue-from-branch').value, sectionCode = document.getElementById('issue-to-section').value; const ref = document.getElementById('issue-ref').value, notes = document.getElementById('issue-notes').value; if(userCan('viewAllBranches') && !state.currentUser.AssignedBranchCode) { const context = await requestAdminContext({ fromBranch: true, toSection: true }); if(!context) return; fromBranchCode = context.fromBranch; sectionCode = context.toSection; } if (!fromBranchCode || !sectionCode || !ref || state.currentIssueList.length === 0) { showToast('Please fill all issue details and select at least one item.', 'error'); return; } const payload = { type: 'issue', batchId: ref, ref: ref, fromBranchCode, sectionCode, date: new Date().toISOString(), items: state.currentIssueList.map(i => ({...i, type: 'issue'})), notes }; await handleTransactionSubmit(payload, btn); });
        document.getElementById('btn-submit-po').addEventListener('click', async (e) => { const btn = e.currentTarget; const supplierCode = document.getElementById('po-supplier').value, poId = document.getElementById('po-ref').value, notes = document.getElementById('po-notes').value; if (!supplierCode || state.currentPOList.length === 0) { showToast('Please select a supplier and add items.', 'error'); return; } const totalValue = state.currentPOList.reduce((acc, item) => acc + ((parseFloat(item.quantity) || 0) * (parseFloat(item.cost) || 0)), 0); const payload = { type: 'po', poId, supplierCode, date: new Date().toISOString(), items: state.currentPOList, totalValue, notes }; await handleTransactionSubmit(payload, btn); });
        document.getElementById('btn-submit-return').addEventListener('click', async (e) => { const btn = e.currentTarget; const supplierCode = document.getElementById('return-supplier').value; let fromBranchCode = document.getElementById('return-branch').value; const ref = document.getElementById('return-ref').value, notes = document.getElementById('return-notes').value; if(userCan('viewAllBranches') && !state.currentUser.AssignedBranchCode) { const context = await requestAdminContext({ fromBranch: true }); if(!context) return; fromBranchCode = context.fromBranch; } if (!supplierCode || !fromBranchCode || !ref || state.currentReturnList.length === 0) { showToast('Please fill all required fields and add items.', 'error'); return; } const payload = { type: 'return_out', batchId: `RTN-${Date.now()}`, ref: ref, supplierCode, fromBranchCode, date: new Date().toISOString(), items: state.currentReturnList.map(i => ({...i, type: 'return_out'})), notes }; await handleTransactionSubmit(payload, btn); });
        document.getElementById('btn-submit-request').addEventListener('click', async(e) => { const btn = e.currentTarget; let fromSection = state.currentUser.AssignedSectionCode, toBranch = state.currentUser.AssignedBranchCode; const requestType = document.getElementById('request-type').value; const notes = document.getElementById('request-notes').value; if(userCan('viewAllBranches') && !state.currentUser.AssignedBranchCode) { const context = await requestAdminContext({ toBranch: true, fromSection: true }); if(!context) return; fromSection = context.fromSection; toBranch = context.toBranch; } if(state.currentRequestList.length === 0){ showToast('Please select items for your request.', 'error'); return; } if(!fromSection || !toBranch){ showToast('Your user is not assigned a branch/section to make requests. Please contact an admin.', 'error'); return; } const payload = { requestId: `REQ-${Date.now()}`, requestType, notes, items: state.currentRequestList, FromSection: fromSection, ToBranch: toBranch }; const result = await postData('addItemRequest', payload, btn); if(result){ showToast('Request submitted successfully!', 'success'); state.currentRequestList = []; document.getElementById('form-create-request').reset(); renderRequestListTable(); reloadDataAndRefreshUI(); }});
        
        document.getElementById('btn-submit-adjustment').addEventListener('click', async (e) => {
            const btn = e.currentTarget;
            let branchCode = document.getElementById('adjustment-branch').value;
            const ref = document.getElementById('adjustment-ref').value;
            const notes = document.getElementById('adjustment-notes').value;
            if(userCan('viewAllBranches') && !state.currentUser.AssignedBranchCode) { const context = await requestAdminContext({ branch: true }); if(!context) return; branchCode = context.branch; }
            if (!branchCode || !ref || !state.currentAdjustmentList || state.currentAdjustmentList.length === 0) { showToast('Please select a branch, provide a reference, and add items.', 'error'); return; }
            const stock = calculateStockLevels();
            const adjustmentItems = state.currentAdjustmentList.map(item => {
                const systemQty = (stock[branchCode]?.[item.itemCode]?.quantity) || 0;
                const physicalCount = item.physicalCount || 0;
                const adjustmentQty = physicalCount - systemQty;
                if (Math.abs(adjustmentQty) < 0.01) return null;
                return { itemCode: item.itemCode, quantity: Math.abs(adjustmentQty), type: adjustmentQty > 0 ? 'adjustment_in' : 'adjustment_out', cost: findByKey(state.items, 'code', item.itemCode)?.cost || 0 };
            }).filter(Boolean);
            if (adjustmentItems.length === 0) { showToast('No adjustments needed.', 'info'); return; }
            const payload = { type: 'stock_adjustment', batchId: `ADJ-${Date.now()}`, ref: ref, fromBranchCode: branchCode, notes: notes, items: adjustmentItems };
            await handleTransactionSubmit(payload, btn);
            state.currentAdjustmentList = []; renderAdjustmentListTable(); document.getElementById('form-adjustment-details').reset();
        });

        document.getElementById('form-record-payment').addEventListener('submit', async e => {
            e.preventDefault(); const btn = e.target.querySelector('button[type="submit"]');
            const supplierCode = document.getElementById('payment-supplier-select').value;
            const method = document.getElementById('payment-method').value;
            if (!supplierCode || state.invoiceModalSelections.size === 0) { showToast('Please select supplier and invoices.', 'error'); return; }
            const paymentId = `PAY-${Date.now()}`;
            let totalAmount = 0; const payments = [];
            document.querySelectorAll('.payment-amount-input').forEach(input => {
                const amount = parseFloat(input.value) || 0;
                if (amount > 0) { totalAmount += amount; payments.push({ paymentId, date: new Date().toISOString(), supplierCode, invoiceNumber: input.dataset.invoice, amount, method }); }
            });
            if (payments.length === 0) { showToast('Amount must be greater than zero.', 'error'); return; }
            const payload = { supplierCode, method, date: new Date().toISOString(), totalAmount, payments };
            const result = await postData('addPaymentBatch', payload, btn);
            if (result) { showToast('Payment recorded!', 'success'); generatePaymentVoucher(payload); state.invoiceModalSelections.clear(); document.getElementById('form-record-payment').reset(); renderPaymentList(); reloadDataAndRefreshUI(); }
        });

        setupInputTableListeners('table-receive-list', 'currentReceiveList', renderReceiveListTable);
        setupInputTableListeners('table-transfer-list', 'currentTransferList', renderTransferListTable);
        setupInputTableListeners('table-issue-list', 'currentIssueList', renderIssueListTable);
        setupInputTableListeners('table-po-list', 'currentPOList', renderPOListTable);
        setupInputTableListeners('table-edit-po-list', 'currentEditingPOList', renderPOEditListTable);
        setupInputTableListeners('table-return-list', 'currentReturnList', renderReturnListTable);
        setupInputTableListeners('table-request-list', 'currentRequestList', renderRequestListTable);
        setupInputTableListeners('table-adjustment-list', 'currentAdjustmentList', renderAdjustmentListTable);
    }

    // --- CLICK HANDLERS ---
    function handleMainContentClicks(e) {
        const btn = e.target.closest('button');
        if (!btn) return;
        
        if (btn.dataset.context) openItemSelectorModal(e);
        if (btn.dataset.selectionType) openSelectionModal(btn.dataset.selectionType);
        if (btn.id === 'btn-select-invoices') openInvoiceSelectorModal();
        
        if (btn.classList.contains('btn-edit')) openEditModal(btn.dataset.type, btn.dataset.id);
        if (btn.classList.contains('btn-history')) openHistoryModal(btn.dataset.id);
        if (btn.id === 'btn-add-new-user') openEditModal('user', null);
        if (btn.id === 'btn-add-new-role') { const roleName = prompt(_t('add_role_prompt')); if(roleName) { postData('addRole', { RoleName: roleName }, btn).then(res => res && reloadDataAndRefreshUI()); } }
        
        if (btn.classList.contains('btn-view-tx')) {
             const batchId = btn.dataset.batchId; const type = btn.dataset.type;
             if (type === 'po') {
                 const data = findByKey(state.purchaseOrders, 'poId', batchId);
                 const items = (state.purchaseOrderItems || []).filter(i => i.poId === batchId);
                 if (data && items) generatePODocument({ ...data, items });
             } else {
                 const transactionGroup = state.transactions.filter(t => t.batchId === batchId);
                 if (transactionGroup.length > 0) {
                     const first = transactionGroup[0];
                     const data = { ...first, items: transactionGroup.map(t => ({...t, itemName: findByKey(state.items, 'code', t.itemCode)?.name })) };
                     if (type === 'receive') generateReceiveDocument(data);
                     else if (type.startsWith('transfer')) generateTransferDocument(data);
                     else if (type === 'issue') generateIssueDocument(data);
                     else if (type === 'return_out') generateReturnDocument(data);
                 }
             }
        }
        
        if (btn.classList.contains('btn-receive-transfer')) openViewTransferModal(btn.dataset.batchId);
        if (btn.classList.contains('btn-edit-transfer')) openPOEditModal(btn.dataset.batchId); 
        if (btn.classList.contains('btn-cancel-transfer')) { const batchId = btn.dataset.batchId; if (confirm(`Cancel transfer ${batchId}?`)) { postData('cancelTransfer', { batchId }, btn).then(res => res && reloadDataAndRefreshUI()); } }
        
        if (btn.classList.contains('btn-approve-request')) openApproveRequestModal(btn.dataset.id); 
        if (btn.classList.contains('btn-reject-request')) { if(confirm('Reject request?')) postData('rejectItemRequest', { requestId: btn.dataset.id }, btn).then(res => res && reloadDataAndRefreshUI()); }
        
        if (btn.classList.contains('btn-edit-po')) openPOEditModal(btn.dataset.poId);
        if (btn.classList.contains('btn-edit-invoice')) openInvoiceEditModal(btn.dataset.batchId);
        
        if (btn.classList.contains('btn-approve-financial') || btn.classList.contains('btn-reject-financial')) {
            const id = btn.dataset.id, type = btn.dataset.type, action = btn.classList.contains('btn-approve-financial') ? 'approveFinancial' : 'rejectFinancial';
            if (confirm(`Confirm ${action.replace('Financial','')} for ${type}?`)) {
                postData(action, { id, type }, btn).then(res => { if(res) { showToast('Processed successfully', 'success'); reloadDataAndRefreshUI(); } });
            }
        }
        
        if (btn.id === 'btn-generate-supplier-statement') renderSupplierStatement(document.getElementById('supplier-statement-select').value, document.getElementById('statement-start-date').value, document.getElementById('statement-end-date').value);
        if (btn.id === 'btn-generate-consumption-report') renderUnifiedConsumptionReport();
    }

    function handleGlobalClicks(e) {
        if (e.target.classList.contains('close-button') || e.target.classList.contains('modal-cancel')) closeModal();
        if (e.target.id === 'btn-save-po-changes') savePOChanges(e);
        if (e.target.id === 'btn-save-invoice-changes') saveInvoiceChanges(e);
        if (e.target.id === 'btn-confirm-request-approval') confirmRequestApproval(e);
        if (e.target.id === 'btn-confirm-receive-transfer') {
            const batchId = e.target.dataset.batchId;
            const transferGroup = state.transactions.filter(t => t.batchId === batchId);
            const payload = { originalBatchId: batchId, ref: transferGroup[0].ref, fromBranchCode: transferGroup[0].fromBranchCode, toBranchCode: transferGroup[0].toBranchCode, items: transferGroup.map(t => ({ itemCode: t.itemCode, quantity: t.quantity })), notes: `Received ${batchId}` };
            postData('receiveTransfer', payload, e.target).then(res => { if(res) { showToast('Received!', 'success'); closeModal(); reloadDataAndRefreshUI(); } });
        }
        if (e.target.id === 'btn-reject-transfer') {
             if(confirm('Reject transfer?')) postData('rejectTransfer', { batchId: e.target.dataset.batchId }, e.target).then(res => { if(res) { showToast('Rejected.', 'success'); closeModal(); reloadDataAndRefreshUI(); } });
        }
    }

    // --- LOGIC HELPERS ---
    async function handleTransactionSubmit(payload, buttonEl) {
        const action = payload.type === 'po' ? 'addPurchaseOrder' : 'addTransactionBatch';
        const result = await postData(action, payload, buttonEl);
        if (result) {
            const typeKey = payload.type.replace(/_/g,'');
            if (payload.type === 'receive') { state.currentReceiveList = []; document.getElementById('form-receive-details').reset(); renderReceiveListTable(); }
            else if (payload.type === 'transfer_out') { generateTransferDocument(result.data); state.currentTransferList = []; document.getElementById('form-transfer-details').reset(); document.getElementById('transfer-ref').value = generateId('TRN'); renderTransferListTable(); }
            else if (payload.type === 'issue') { generateIssueDocument(result.data); state.currentIssueList = []; document.getElementById('form-issue-details').reset(); document.getElementById('issue-ref').value = generateId('ISN'); renderIssueListTable(); }
            else if (payload.type === 'po') { state.currentPOList = []; document.getElementById('form-po-details').reset(); document.getElementById('po-ref').value = generateId('PO'); renderPOListTable(); }
            else if (payload.type === 'return_out') { generateReturnDocument(result.data); state.currentReturnList = []; document.getElementById('form-return-details').reset(); renderReturnListTable(); }
            showToast(_t('tx_processed_toast', {txType: _t(typeKey)}), 'success');
            await reloadDataAndRefreshUI();
        }
    }

    function setupSearch(inputId, renderFn, dataKey, searchKeys) { const searchInput = document.getElementById(inputId); if (!searchInput) return; searchInput.addEventListener('input', e => { const searchTerm = e.target.value.toLowerCase(); const dataToFilter = state[dataKey] || []; renderFn(searchTerm ? dataToFilter.filter(item => searchKeys.some(key => item[key] && String(item[key]).toLowerCase().includes(searchTerm))) : dataToFilter); }); }
    
    function setupInputTableListeners(tableId, listName, rendererFn) {
        const table = document.getElementById(tableId); if (!table) return;
        table.addEventListener('change', e => { if (e.target.classList.contains('table-input')) { const index = parseInt(e.target.dataset.index); const field = e.target.dataset.field; const value = e.target.type === 'number' ? parseFloat(e.target.value) : e.target.value; if (state[listName] && state[listName][index] && !isNaN(value)) { state[listName][index][field] = value; } if (rendererFn) rendererFn(); } });
        table.addEventListener('click', e => { const btn = e.target.closest('button'); if (btn && btn.classList.contains('danger') && btn.dataset.index) { state[listName].splice(btn.dataset.index, 1); rendererFn(); } });
    }

    function setupRoleBasedNav() {
        const user = state.currentUser; if (!user) return;
        const userFirstName = user.Name.split(' ')[0];
        document.querySelector('.sidebar-header h1').textContent = _t('hi_user', {userFirstName});
        const navMap = { 'dashboard': 'viewDashboard', 'operations': 'viewOperations', 'purchasing': 'viewPurchasing', 'requests': 'viewRequests', 'payments': 'viewPayments', 'reports': 'viewReports', 'stock-levels': 'viewStockLevels', 'transaction-history': 'viewTransactionHistory', 'setup': 'viewSetup', 'master-data': 'viewMasterData', 'user-management': 'manageUsers', 'backup': 'opBackupRestore', 'activity-log': 'viewActivityLog' };
        for (const [view, permission] of Object.entries(navMap)) {
            const navItem = document.querySelector(`[data-view="${view}"]`);
            if (navItem) { 
                let hasPermission = userCan(permission);
                if (view === 'requests') hasPermission = userCan('opRequestItems') || userCan('opApproveIssueRequest') || userCan('opApproveResupplyRequest');
                if (view === 'operations') hasPermission = userCan('viewOperations') || userCan('opStockAdjustment') || userCan('opFinancialAdjustment');
                navItem.parentElement.style.display = hasPermission ? '' : 'none'; 
            }
        }
    }

    function updateUserBranchDisplay() {
        const displayEl = document.getElementById('user-branch-display');
        if (!state.currentUser || !displayEl) return;
        const branch = findByKey(state.branches, 'branchCode', state.currentUser.AssignedBranchCode);
        const section = findByKey(state.sections, 'sectionCode', state.currentUser.AssignedSectionCode);
        let displayText = '';
        if (branch) displayText += `${_t('branch')}: ${branch.branchName}`;
        if (section) displayText += `${displayText ? ' / ' : ''}${_t('section')}: ${section.sectionName}`;
        displayEl.textContent = displayText;
    }

    function updatePendingRequestsWidget() {
        const widget = document.getElementById('pending-requests-widget');
        if (!userCan('opApproveIssueRequest') && !userCan('opApproveResupplyRequest')) { widget.style.display = 'none'; return; }
        const pendingRequests = (state.itemRequests || []).filter(r => r.Status === 'Pending' && (userCan('viewAllBranches') || r.ToBranch === state.currentUser.AssignedBranchCode));
        const count = new Set(pendingRequests.map(r => r.RequestID)).size;
        if(count > 0) { document.getElementById('pending-requests-count').textContent = count; document.getElementById('pending-requests-widget-text').textContent = _t('pending_requests_widget', {count: ''}); widget.style.display = 'flex'; } else { widget.style.display = 'none'; }
    }

    function applyUserUIConstraints() {
        if (!state.currentUser) return;
        const branchCode = state.currentUser.AssignedBranchCode;
        if (branchCode) {
            ['receive-branch', 'issue-from-branch', 'transfer-from-branch', 'return-branch', 'adjustment-branch'].forEach(id => {
                const el = document.getElementById(id);
                if (el && !userCan('viewAllBranches')) { el.value = branchCode; el.disabled = true; el.dispatchEvent(new Event('change')); }
            });
        }
    }

    // --- MODAL FUNCTIONS RE-IMPLEMENTATION ---
    function closeModal() { document.querySelectorAll('.modal-overlay').forEach(modal => modal.classList.remove('active')); modalSearchInput.value = ''; modalContext = null; }

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

    function openInvoiceSelectorModal() {
        const modalInvoiceList = document.getElementById('modal-invoice-list');
        const supplierCode = document.getElementById('payment-supplier-select').value;
        const supplierFinancials = calculateSupplierFinancials();
        const supplierInvoices = supplierFinancials[supplierCode]?.invoices;
        modalInvoiceList.innerHTML = '';
        if (!supplierInvoices || Object.keys(supplierInvoices).length === 0) { modalInvoiceList.innerHTML = `<p>${_t('no_invoices_for_supplier')}</p>`; return; }
        const unpaidInvoices = Object.values(supplierInvoices).filter(inv => inv.status !== 'Paid');
        if (unpaidInvoices.length === 0) { modalInvoiceList.innerHTML = `<p>${_t('no_unpaid_invoices')}</p>`; return; }
        unpaidInvoices.sort((a, b) => new Date(a.date) - new Date(b.date)).forEach(invoice => {
            const isChecked = state.invoiceModalSelections.has(invoice.number);
            const itemDiv = document.createElement('div');
            itemDiv.className = 'modal-item';
            itemDiv.innerHTML = `<input type="checkbox" id="modal-invoice-${invoice.number}" data-number="${invoice.number}" ${isChecked ? 'checked' : ''}><label for="modal-invoice-${invoice.number}"><strong>${invoice.number}</strong><br><small>Due: ${invoice.balance.toFixed(2)}</small></label>`;
            modalInvoiceList.appendChild(itemDiv);
        });
        invoiceSelectorModal.classList.add('active');
    }

    function handleInvoiceModalCheckboxChange(e) {
        if (e.target.type === 'checkbox') {
            const invoiceNumber = e.target.dataset.number;
            if (e.target.checked) state.invoiceModalSelections.add(invoiceNumber);
            else state.invoiceModalSelections.delete(invoiceNumber);
        }
    }

    function handleModalCheckboxChange(e) {
        if (e.target.type === 'checkbox') {
            const itemCode = e.target.dataset.code;
            if (e.target.checked) state.modalSelections.add(itemCode);
            else state.modalSelections.delete(itemCode);
        }
    }

    function openEditModal(type, id) {
        let record, formHtml;
        formEditRecord.dataset.type = type; formEditRecord.dataset.id = id;
        if (type === 'user') {
            record = findByKey(state.allUsers, 'Username', id);
            editModalTitle.textContent = id ? _t('edit_user') : _t('add_new_user_title');
            const roleOptions = state.allRoles.map(r => `<option value="${r.RoleName}" ${record && r.RoleName === record.RoleName ? 'selected' : ''}>${r.RoleName}</option>`).join('');
            const branchOptions = state.branches.map(b => `<option value="${b.branchCode}" ${record && b.branchCode === record.AssignedBranchCode ? 'selected' : ''}>${b.branchName}</option>`).join('');
            const sectionOptions = state.sections.map(s => `<option value="${s.sectionCode}" ${record && s.sectionCode === record.AssignedSectionCode ? 'selected' : ''}>${s.sectionName}</option>`).join('');
            formHtml = `<div class="form-grid"><div class="form-group"><label>${_t('username')}</label><input type="text" name="Username" value="${record ? record.Username : ''}" ${id ? 'readonly' : 'required'}></div><div class="form-group"><label>${_t('table_h_fullname')}</label><input type="text" name="Name" value="${record ? record.Name : ''}" required></div><div class="form-group"><label>${_t('table_h_role')}</label><select name="RoleName" required>${roleOptions}</select></div><div class="form-group"><label>${_t('branch')}</label><select name="AssignedBranchCode"><option value="">None</option>${branchOptions}</select></div><div class="form-group"><label>${_t('section')}</label><select name="AssignedSectionCode"><option value="">None</option>${sectionOptions}</select></div><div class="form-group span-full"><label>${id ? _t('edit_user_password_label') : _t('edit_user_password_label_new')}</label><input type="password" name="LoginCode" ${!id ? 'required' : ''}></div></div>`;
            if(id) formHtml += `<div class="form-group span-full"><button type="button" id="btn-toggle-user-status" class="${record.isDisabled ? 'primary' : 'danger'}">${record.isDisabled ? 'Enable' : 'Disable'}</button></div>`;
            editModalBody.innerHTML = formHtml;
            if(document.getElementById('btn-toggle-user-status')) {
                document.getElementById('btn-toggle-user-status').addEventListener('click', async () => { if(confirm('Change user status?')) { await postData('updateUser', { Username: id, updates: { isDisabled: !record.isDisabled } }, null); closeModal(); reloadDataAndRefreshUI(); } });
            }
        }
        else if(type === 'item') {
            record = findByKey(state.items, 'code', id);
            editModalTitle.textContent = _t('edit_item');
            formHtml = `<div class="form-grid"><div class="form-group"><label>${_t('item_code')}</label><input type="text" value="${record.code}" readonly></div><div class="form-group"><label>${_t('barcode')}</label><input type="text" name="barcode" value="${record.barcode || ''}"></div><div class="form-group"><label>${_t('item_name')}</label><input type="text" name="name" value="${record.name}" required></div><div class="form-group"><label>${_t('unit')}</label><input type="text" name="unit" value="${record.unit}" required></div><div class="form-group"><label>${_t('category')}</label><select name="category" required><option value="Packing">${_t('packing')}</option><option value="Cleaning">${_t('cleaning')}</option></select></div><div class="form-group"><label>${_t('default_supplier')}</label><select name="supplierCode" id="edit-item-supplier"></select></div><div class="form-group span-full"><label>${_t('default_cost')}</label><input type="number" name="cost" step="0.01" min="0" value="${record.cost}" required></div></div>`;
            editModalBody.innerHTML = formHtml;
            populateOptions(document.getElementById('edit-item-supplier'), state.suppliers, _t('select_supplier'), 'supplierCode', 'name');
            document.getElementById('edit-item-supplier').value = record.supplierCode;
        }
        else if(type === 'supplier') {
            record = findByKey(state.suppliers, 'supplierCode', id);
            editModalTitle.textContent = _t('edit_supplier');
            editModalBody.innerHTML = `<div class="form-grid"><div class="form-group"><label>${_t('supplier_code')}</label><input type="text" value="${record.supplierCode}" readonly></div><div class="form-group"><label>${_t('supplier_name')}</label><input type="text" name="name" value="${record.name}" required></div><div class="form-group"><label>${_t('contact_info')}</label><input type="text" name="contact" value="${record.contact || ''}"></div></div>`;
        }
        editModal.classList.add('active');
    }

    async function handleUpdateSubmit(e) {
        e.preventDefault();
        const type = formEditRecord.dataset.type; const id = formEditRecord.dataset.id;
        const formData = new FormData(formEditRecord);
        let payload = {}, action;
        if (type === 'user') {
            action = id ? 'updateUser' : 'addUser';
            if(id) { payload = { Username: id, updates: {} }; for (let [k, v] of formData.entries()) { if (k !== 'Username' && (k !== 'LoginCode' || v !== '')) payload.updates[k] = v; } }
            else { for (let [k, v] of formData.entries()) payload[k] = v; }
        } else {
            action = 'updateData'; const updates = {}; for (let [k, v] of formData.entries()) updates[k] = v; payload = { type, id, updates };
        }
        if (await postData(action, payload, e.target.querySelector('button[type="submit"]'))) { showToast('Saved!', 'success'); closeModal(); reloadDataAndRefreshUI(); }
    }

    async function openHistoryModal(itemCode) {
        const item = findByKey(state.items, 'code', itemCode);
        document.getElementById('history-modal-title').textContent = _t('history_for', {itemName: item.name, itemCode: item.code});
        historyModal.classList.add('active');
        const result = await postData('getItemHistory', { itemCode }, null);
        if (result && result.data) {
            // Price History
            let html = `<h4>${_t('price_change_log')}</h4><table><thead><tr><th>Date</th><th>Old</th><th>New</th><th>User</th></tr></thead><tbody>`;
            result.data.priceHistory.forEach(h => html += `<tr><td>${new Date(h.Timestamp).toLocaleDateString()}</td><td>${h.OldCost}</td><td>${h.NewCost}</td><td>${h.UpdatedBy}</td></tr>`);
            document.getElementById('subview-price-history').innerHTML = html + `</tbody></table>`;
            
            // Movement History
            let moveHtml = `<table><thead><tr><th>Date</th><th>Type</th><th>Ref</th><th>Qty In</th><th>Qty Out</th></tr></thead><tbody>`;
            result.data.movementHistory.forEach(m => {
                const qIn = ['receive','transfer_in','adjustment_in'].includes(m.type) ? m.quantity : '-';
                const qOut = ['issue','transfer_out','return_out','adjustment_out'].includes(m.type) ? m.quantity : '-';
                moveHtml += `<tr><td>${new Date(m.date).toLocaleDateString()}</td><td>${m.type}</td><td>${m.ref||m.batchId}</td><td>${qIn}</td><td>${qOut}</td></tr>`;
            });
            document.getElementById('movement-history-table-container').innerHTML = moveHtml + `</tbody></table>`;
        }
    }

    function openPOEditModal(poId) {
        const po = findByKey(state.purchaseOrders, 'poId', poId);
        state.currentEditingPOList = state.purchaseOrderItems.filter(i => i.poId === poId).map(i => ({...i, itemName: findByKey(state.items, 'code', i.itemCode)?.name, quantity: parseFloat(i.quantity), cost: parseFloat(i.cost)}));
        document.getElementById('edit-po-modal-body').innerHTML = `<div class="form-grid"><div class="form-group"><label>PO #</label><input type="text" value="${po.poId}" readonly></div><div class="form-group span-full"><label>Notes</label><textarea id="edit-po-notes">${po.notes || ''}</textarea></div></div><div class="card"><table id="table-edit-po-list"><thead><tr><th>Code</th><th>Name</th><th>Qty</th><th>Cost</th><th>Total</th><th></th></tr></thead><tbody></tbody></table><button type="button" data-context="edit-po" class="secondary">Select Items</button></div>`;
        const footer = editPOModal.querySelector('.modal-footer');
        if(!footer.querySelector('#btn-save-po-changes')) footer.innerHTML += `<button id="btn-save-po-changes" class="primary" data-po-id="${po.poId}">Save Changes</button>`;
        else footer.querySelector('#btn-save-po-changes').dataset.poId = po.poId;
        renderPOEditListTable();
        editPOModal.classList.add('active');
    }

    async function savePOChanges(e) {
        const btn = e.currentTarget;
        const payload = { poId: btn.dataset.poId, notes: document.getElementById('edit-po-notes').value, items: state.currentEditingPOList, totalValue: state.currentEditingPOList.reduce((acc, i) => acc + (i.quantity * i.cost), 0) };
        if(await postData('editPurchaseOrder', payload, btn)) { showToast('Updated PO', 'success'); closeModal(); reloadDataAndRefreshUI(); }
    }

    function openApproveRequestModal(requestId) {
        const reqs = state.itemRequests.filter(r => r.RequestID === requestId);
        if(reqs.length === 0) return;
        const first = reqs[0];
        document.getElementById('approve-request-modal-title').textContent = `Approve ${requestId}`;
        let html = `<p>From: ${first.FromSection} To: ${first.ToBranch}</p><table><thead><tr><th>Code</th><th>Item</th><th>Req Qty</th><th>Avail</th><th>Issue Qty</th></tr></thead><tbody>`;
        reqs.forEach(r => {
            const avail = calculateStockLevels()[first.ToBranch]?.[r.ItemCode]?.quantity || 0;
            html += `<tr><td>${r.ItemCode}</td><td>${findByKey(state.items, 'code', r.ItemCode)?.name}</td><td>${r.Quantity}</td><td>${avail.toFixed(2)}</td><td><input type="number" class="table-input" data-item-code="${r.ItemCode}" value="${r.Quantity}" max="${avail}"></td></tr>`;
        });
        html += `</tbody></table><div class="form-group"><label>Notes</label><textarea id="approve-status-notes"></textarea></div>`;
        document.getElementById('approve-request-modal-body').innerHTML = html;
        document.getElementById('btn-confirm-request-approval').dataset.requestId = requestId;
        approveRequestModal.classList.add('active');
    }

    async function confirmRequestApproval(e) {
        const requestId = e.target.closest('button').dataset.requestId;
        const editedItems = Array.from(document.querySelectorAll('#approve-request-modal tbody tr')).map(tr => ({ itemCode: tr.querySelector('input').dataset.itemCode, issuedQuantity: parseFloat(tr.querySelector('input').value) || 0 }));
        const statusNotes = document.getElementById('approve-status-notes').value;
        if(await postData('approveItemRequest', { requestId, statusNotes, editedItems }, e.target)) { showToast('Approved!', 'success'); closeModal(); reloadDataAndRefreshUI(); }
    }

    function openViewTransferModal(batchId) {
        const txs = state.transactions.filter(t => t.batchId === batchId);
        document.getElementById('view-transfer-modal-body').innerHTML = `<table><thead><tr><th>Code</th><th>Qty</th></tr></thead><tbody>${txs.map(t => `<tr><td>${t.itemCode}</td><td>${t.quantity}</td></tr>`).join('')}</tbody></table>`;
        document.getElementById('btn-confirm-receive-transfer').dataset.batchId = batchId;
        document.getElementById('btn-reject-transfer').dataset.batchId = batchId;
        viewTransferModal.classList.add('active');
    }

    function openSelectionModal(type) {
        state.currentSelectionModal.type = type;
        const listEl = document.getElementById('selection-modal-list');
        listEl.innerHTML = '';
        let data = [];
        if(type === 'branches') data = state.branches.map(b => ({id: b.branchCode, name: b.branchName}));
        if(type === 'sections') data = state.sections.map(s => ({id: s.sectionCode, name: s.sectionName}));
        if(type === 'items') data = state.items.map(i => ({id: i.code, name: i.name}));
        data.forEach(item => {
            const div = document.createElement('div'); div.className = 'modal-item';
            div.innerHTML = `<input type="checkbox" data-id="${item.id}" ${state.currentSelectionModal.tempSelections.has(item.id) ? 'checked' : ''}><label>${item.name}</label>`;
            listEl.appendChild(div);
        });
        selectionModal.classList.add('active');
    }

    function confirmReportSelection() {
        const type = state.currentSelectionModal.type;
        const set = state.currentSelectionModal.tempSelections;
        if(type === 'branches') state.reportSelectedBranches = new Set(set);
        if(type === 'sections') state.reportSelectedSections = new Set(set);
        if(type === 'items') state.reportSelectedItems = new Set(set);
        document.getElementById(`consumption-${type.slice(0, -1)}-count`).textContent = `${set.size} selected`;
        closeModal();
    }

    function renderSelectionModalContent(filter) {
        const listEl = document.getElementById('selection-modal-list');
        listEl.innerHTML = '';
        const type = state.currentSelectionModal.type;
        const lowerFilter = filter.toLowerCase();
        let data = [];
        if(type === 'branches') data = state.branches.map(b => ({id: b.branchCode, name: b.branchName}));
        if(type === 'sections') data = state.sections.map(s => ({id: s.sectionCode, name: s.sectionName}));
        if(type === 'items') data = state.items.map(i => ({id: i.code, name: i.name}));
        
        data.filter(i => i.name.toLowerCase().includes(lowerFilter)).forEach(item => {
            const div = document.createElement('div'); div.className = 'modal-item';
            div.innerHTML = `<input type="checkbox" data-id="${item.id}" ${state.currentSelectionModal.tempSelections.has(item.id) ? 'checked' : ''}><label>${item.name}</label>`;
            listEl.appendChild(div);
        });
    }

    async function loadAndRenderBackups() {
        const container = document.getElementById('backup-list-container');
        container.innerHTML = '<div class="spinner"></div>';
        const res = await postData('listBackups', {}, null);
        if(res && res.data) {
            state.backups = res.data;
            container.innerHTML = state.backups.length ? `<table><tbody>${state.backups.map(b => `<tr><td>${b.name}</td><td>${new Date(b.dateCreated).toLocaleDateString()}</td><td><button class="danger small btn-restore" data-url="${b.url}">Restore</button></td></tr>`).join('')}</tbody></table>` : '<p>No backups found.</p>';
        }
    }

    async function loadAutoBackupSettings() {
        const res = await postData('getAutomaticBackupStatus', {}, null);
        if(res && res.data) {
            document.getElementById('auto-backup-toggle').checked = res.data.enabled;
            document.getElementById('auto-backup-frequency-container').style.display = res.data.enabled ? 'block' : 'none';
        }
    }

    async function handleAutoBackupToggle() {
        const enabled = document.getElementById('auto-backup-toggle').checked;
        const frequency = document.getElementById('auto-backup-frequency').value;
        document.getElementById('auto-backup-frequency-container').style.display = enabled ? 'block' : 'none';
        await postData('setAutomaticBackup', { enabled, frequency }, null);
        showToast('Backup settings updated', 'success');
    }

    function openRestoreModal(fileId, fileName) {
        document.getElementById('restore-filename-display').textContent = fileName;
        document.getElementById('btn-confirm-restore').dataset.fileId = fileId;
        document.getElementById('restore-sheet-list').innerHTML = ['Items','Suppliers','Transactions'].map(s => `<div><input type="checkbox" value="${s}" checked> ${s}</div>`).join('');
        restoreModal.classList.add('active');
    }

    async function handleConfirmRestore(e) {
        const fileId = e.target.dataset.fileId;
        const sheets = Array.from(document.querySelectorAll('#restore-sheet-list input:checked')).map(i => i.value);
        if(document.getElementById('restore-confirmation-input').value === 'RESTORE') {
            await postData('restoreFromBackup', { backupFileId: fileId, sheetsToRestore: sheets }, e.target);
            showToast('Restored!', 'success'); closeModal(); reloadDataAndRefreshUI();
        }
    }

    function confirmContextSelection() {
        const context = {
            fromBranch: contextModal.querySelector('#context-modal-fromBranch-group').style.display === 'block' ? document.getElementById('context-from-branch-select').value : null,
            toBranch: contextModal.querySelector('#context-modal-toBranch-group').style.display === 'block' ? document.getElementById('context-to-branch-select').value : null,
            branch: contextModal.querySelector('#context-modal-branch-group').style.display === 'block' ? document.getElementById('context-branch-select').value : null,
            toSection: contextModal.querySelector('#context-modal-toSection-group').style.display === 'block' ? document.getElementById('context-to-section-select').value : null,
            fromSection: contextModal.querySelector('#context-modal-fromSection-group').style.display === 'block' ? document.getElementById('context-from-section-select').value : null,
        };
        if (state.adminContextPromise.resolve) state.adminContextPromise.resolve(context);
        contextModal.classList.remove('active');
    }

    async function requestAdminContext(config) {
        // Reset and show specific fields
        ['fromBranch','toBranch','branch','fromSection','toSection'].forEach(k => {
            const el = document.getElementById(`context-modal-${k}-group`);
            if(el) el.style.display = config[k] ? 'block' : 'none';
        });
        
        if(config.branch) populateOptions(document.getElementById('context-branch-select'), state.branches, 'Select Branch', 'branchCode', 'branchName');
        if(config.fromBranch) populateOptions(document.getElementById('context-from-branch-select'), state.branches, 'Select From Branch', 'branchCode', 'branchName');
        if(config.toBranch) populateOptions(document.getElementById('context-to-branch-select'), state.branches, 'Select To Branch', 'branchCode', 'branchName');
        if(config.fromSection) populateOptions(document.getElementById('context-from-section-select'), state.sections, 'Select From Section', 'sectionCode', 'sectionName');
        if(config.toSection) populateOptions(document.getElementById('context-to-section-select'), state.sections, 'Select To Section', 'sectionCode', 'sectionName');

        contextModal.classList.add('active');
        return new Promise((resolve) => { state.adminContextPromise = { resolve }; });
    }

    function openInvoiceEditModal(batchId) {
        const txs = state.transactions.filter(t => t.batchId === batchId && t.type === 'receive');
        if(txs.length === 0) return;
        state.currentEditingPOList = txs.map(t => ({...t, itemName: findByKey(state.items, 'code', t.itemCode)?.name, quantity: parseFloat(t.quantity), cost: parseFloat(t.cost)}));
        document.getElementById('edit-po-modal-body').innerHTML = `<div class="form-grid"><div class="form-group"><label>Batch</label><input readonly value="${batchId}"></div><div class="form-group"><label>Invoice #</label><input id="edit-invoice-number" value="${txs[0].invoiceNumber}"></div><div class="form-group span-full"><label>Notes</label><textarea id="edit-invoice-notes">${txs[0].notes || ''}</textarea></div></div><div class="card"><table id="table-edit-po-list"><thead><tr><th>Code</th><th>Name</th><th>Qty</th><th>Cost</th><th>Total</th><th></th></tr></thead><tbody></tbody></table></div>`;
        editPOModal.querySelector('.modal-footer').innerHTML = `<button class="secondary modal-cancel">Cancel</button><button id="btn-save-invoice-changes" class="primary" data-batch-id="${batchId}">Save Invoice</button>`;
        renderPOEditListTable();
        editPOModal.classList.add('active');
    }

    async function saveInvoiceChanges(e) {
        const btn = e.currentTarget;
        const payload = { batchId: btn.dataset.batchId, invoiceNumber: document.getElementById('edit-invoice-number').value, notes: document.getElementById('edit-invoice-notes').value, items: state.currentEditingPOList };
        if(await postData('editInvoice', payload, btn)) { showToast('Invoice updated', 'success'); closeModal(); reloadDataAndRefreshUI(); }
    }

    init();
});
