document.addEventListener('DOMContentLoaded', () => {
    Logger.info('DOM fully loaded. Starting initialization...');

    // =========================================================
    // 1. DOM ELEMENT REFERENCES
    // =========================================================
    const loginUsernameInput = document.getElementById('login-username');
    const loginCodeInput = document.getElementById('login-code');
    const loginForm = document.getElementById('login-form');
    const btnLogout = document.getElementById('btn-logout');
    const globalRefreshBtn = document.getElementById('global-refresh-button');
    const mainContent = document.querySelector('.main-content');
    const installBtn = document.getElementById('btn-install-pwa');

    // Mobile UI
    const mobileMenuBtn = document.getElementById('mobile-menu-toggle');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');

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

    // Modal Internals
    const modalItemList = document.getElementById('modal-item-list');
    const modalSearchInput = document.getElementById('modal-search-items');
    const editModalBody = document.getElementById('edit-modal-body');
    const editModalTitle = document.getElementById('edit-modal-title');
    const formEditRecord = document.getElementById('form-edit-record');

    // =========================================================
    // 2. GLOBAL HELPERS (Totalizers)
    // =========================================================
    window.updateReceiveGrandTotal = () => { try { let grandTotal = 0; (state.currentReceiveList || []).forEach(item => { grandTotal += (parseFloat(item.quantity) || 0) * (parseFloat(item.cost) || 0); }); const el = document.getElementById('receive-grand-total'); if(el) el.textContent = `${grandTotal.toFixed(2)} EGP`; } catch(e) { Logger.error('Error in updateReceiveGrandTotal', e); } };
    window.updateTransferGrandTotal = () => { try { let grandTotalQty = 0; (state.currentTransferList || []).forEach(item => { grandTotalQty += (parseFloat(item.quantity) || 0); }); const el = document.getElementById('transfer-grand-total'); if(el) el.textContent = grandTotalQty.toFixed(2); } catch(e) { Logger.error('Error in updateTransferGrandTotal', e); } };
    window.updateIssueGrandTotal = () => { try { let grandTotalQty = 0; (state.currentIssueList || []).forEach(item => { grandTotalQty += (parseFloat(item.quantity) || 0); }); const el = document.getElementById('issue-grand-total'); if(el) el.textContent = grandTotalQty.toFixed(2); } catch(e) { Logger.error('Error in updateIssueGrandTotal', e); } };
    window.updatePOGrandTotal = () => { try { let grandTotal = 0; (state.currentPOList || []).forEach(item => { grandTotal += (parseFloat(item.quantity) || 0) * (parseFloat(item.cost) || 0); }); const el = document.getElementById('po-grand-total'); if(el) el.textContent = `${grandTotal.toFixed(2)} EGP`; } catch(e) { Logger.error('Error in updatePOGrandTotal', e); } };
    window.updatePOEditGrandTotal = () => { try { let grandTotal = 0; (state.currentEditingPOList || []).forEach(item => { grandTotal += (parseFloat(item.quantity) || 0) * (parseFloat(item.cost) || 0); }); const el = document.getElementById('edit-po-grand-total'); if(el) el.textContent = `${grandTotal.toFixed(2)} EGP`; } catch(e) { Logger.error('Error in updatePOEditGrandTotal', e); } };
    window.updateReturnGrandTotal = () => { try { let grandTotal = 0; (state.currentReturnList || []).forEach(item => { grandTotal += (parseFloat(item.quantity) || 0) * (parseFloat(item.cost) || 0); }); const el = document.getElementById('return-grand-total'); if(el) el.textContent = `${grandTotal.toFixed(2)} EGP`; } catch(e) { Logger.error('Error in updateReturnGrandTotal', e); } };

    // =========================================================
    // 3. CORE INITIALIZATION
    // =========================================================
    function init() {
        if(!state.pagination) state.pagination = {};

        // PWA Install Logic
        let deferredPrompt;
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            if (installBtn) {
                installBtn.style.display = 'inline-flex';
                installBtn.addEventListener('click', () => {
                    installBtn.style.display = 'none';
                    deferredPrompt.prompt();
                    deferredPrompt.userChoice.then((choiceResult) => {
                        deferredPrompt = null;
                    });
                });
            }
        });

        window.addEventListener('appinstalled', () => {
            if(installBtn) installBtn.style.display = 'none';
        });

        const langSwitcher = document.getElementById('lang-switcher');
        const savedLang = localStorage.getItem('userLanguage') || 'en';
        state.currentLanguage = savedLang;
        
        if(langSwitcher) {
            langSwitcher.value = savedLang;
            langSwitcher.addEventListener('change', e => {
                const selectedLang = e.target.value;
                localStorage.setItem('userLanguage', selectedLang);
                state.currentLanguage = selectedLang;
                reloadDataAndRefreshUI();
            });
        }
        applyTranslations();

        if(loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const username = loginUsernameInput.value.trim();
                const code = loginCodeInput.value;
                if (username && code) attemptLogin(username, code);
            });
        }
    }

    // --- MAIN UI SETUP (CALLED AFTER LOGIN) ---
    window.initializeAppUI = () => {
        Logger.info('Initializing App UI components...');
        
        try {
            setupRoleBasedNav();
        } catch(e) { Logger.error('Error setting up nav permissions:', e); }

        try {
            attachEventListeners();
            attachSubNavListeners(); 
            setupPaginationListeners();
        } catch(e) { Logger.error('Error attaching listeners:', e); }
        
        // Find default view and show it
        let firstVisibleView = 'dashboard';
        const visibleNavLink = document.querySelector('#main-nav .nav-item:not([style*="display: none"]) a');
        if(visibleNavLink) firstVisibleView = visibleNavLink.dataset.view;

        showView(firstVisibleView);
        updateUserBranchDisplay();
        updatePendingRequestsWidget();
    };

    // =========================================================
    // 4. NAVIGATION & DATA LOADING
    // =========================================================
    window.showView = (viewId, subViewId = null) => {
        Logger.info(`showView called for: ${viewId}`);
        try {
            document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));
            document.querySelectorAll('#main-nav a').forEach(link => link.classList.remove('active'));

            const viewToShow = document.getElementById(`view-${viewId}`);
            if(!viewToShow) return;
            viewToShow.classList.add('active');
            
            const activeLink = document.querySelector(`[data-view="${viewId}"]`);
            if (activeLink) {
                activeLink.classList.add('active');
                const titleSpan = activeLink.querySelector('span');
                if (titleSpan) {
                    const viewTitleKey = titleSpan.dataset.translateKey;
                    const viewTitleEl = document.getElementById('view-title');
                    if(viewTitleEl) {
                        viewTitleEl.textContent = _t(viewTitleKey);
                        viewTitleEl.dataset.translateKey = viewTitleKey;
                    }
                }
            }

            // Sub-view logic
            if (viewToShow.querySelector('.sub-nav')) {
                let targetSubViewId = subViewId;
                if (!targetSubViewId) {
                    const activeSubBtn = viewToShow.querySelector('.sub-nav-item.active');
                    if (activeSubBtn) {
                        targetSubViewId = activeSubBtn.dataset.subview;
                    } else {
                        const firstVisibleTab = viewToShow.querySelector('.sub-nav-item:not([style*="display: none"])');
                        if (firstVisibleTab) targetSubViewId = firstVisibleTab.dataset.subview;
                    }
                }
                
                if (targetSubViewId) {
                    viewToShow.querySelectorAll('.sub-nav-item').forEach(btn => btn.classList.remove('active'));
                    viewToShow.querySelectorAll('.sub-view').forEach(view => view.classList.remove('active'));

                    const subViewBtn = viewToShow.querySelector(`[data-subview="${targetSubViewId}"]`);
                    if(subViewBtn) subViewBtn.classList.add('active');
                    
                    const subViewContainer = viewToShow.querySelector(`#subview-${targetSubViewId}`);
                    if (subViewContainer) subViewContainer.classList.add('active');
                }
            }
            refreshViewData(viewId);
        } catch (err) {
            Logger.error('Error inside showView:', err);
        }
    };

    window.refreshViewData = async (viewId) => {
        if (!state.currentUser) return;
        try {
            switch(viewId) {
                case 'dashboard':
                    const stock = calculateStockLevels();
                    const kpiItems = document.getElementById('dashboard-total-items');
                    if(kpiItems) kpiItems.textContent = (state.items || []).length.toLocaleString();
                    const kpiSuppliers = document.getElementById('dashboard-total-suppliers');
                    if(kpiSuppliers) kpiSuppliers.textContent = (state.suppliers || []).length;
                    const kpiBranches = document.getElementById('dashboard-total-branches');
                    if(kpiBranches) kpiBranches.textContent = (state.branches || []).length;
                    let totalValue = 0;
                    Object.values(stock).forEach(bs => Object.values(bs).forEach(i => totalValue += i.quantity * i.avgCost));
                    const kpiValue = document.getElementById('dashboard-total-value');
                    if(kpiValue) kpiValue.textContent = `${totalValue.toFixed(2)} EGP`;
                    break;
                    
                case 'operations':
                    populateOptions(document.getElementById('receive-supplier'), state.suppliers, _t('select_supplier'), 'supplierCode', 'name');
                    populateOptions(document.getElementById('receive-branch'), state.branches, _t('select_a_branch'), 'branchCode', 'branchName');
                    populateOptions(document.getElementById('transfer-from-branch'), state.branches, _t('select_a_branch'), 'branchCode', 'branchName');
                    populateOptions(document.getElementById('transfer-to-branch'), state.branches, _t('select_a_branch'), 'branchCode', 'branchName');
                    populateOptions(document.getElementById('return-supplier'), state.suppliers, _t('select_supplier'), 'supplierCode', 'name');
                    populateOptions(document.getElementById('return-branch'), state.branches, _t('select_a_branch'), 'branchCode', 'branchName');
                    const openPOs = (state.purchaseOrders || []).filter(po => po.Status === 'Approved');
                    populateOptions(document.getElementById('receive-po-select'), openPOs, _t('select_a_po'), 'poId', 'poId', 'supplierCode');
                    if(document.getElementById('transfer-ref')) document.getElementById('transfer-ref').value = generateId('TRN');
                    renderReceiveListTable(); renderTransferListTable(); renderReturnListTable(); renderPendingTransfers(); renderInTransitReport(); 
                    break;

                case 'adjustments':
                    populateOptions(document.getElementById('adjustment-branch'), state.branches, _t('select_a_branch'), 'branchCode', 'branchName');
                    populateOptions(document.getElementById('fin-adj-supplier'), state.suppliers, _t('select_supplier'), 'supplierCode', 'name');
                    if(!userCan('opStockAdjustment')) {
                        const stockAdjTab = document.querySelector('[data-subview="stock-adj"]');
                        const stockAdjRepTab = document.querySelector('[data-subview="stock-adj-report"]');
                        if(stockAdjTab) stockAdjTab.style.display = 'none';
                        if(stockAdjRepTab) stockAdjRepTab.style.display = 'none';
                    }
                    if(!userCan('opFinancialAdjustment')) {
                        const suppAdjTab = document.querySelector('[data-subview="supplier-adj"]');
                        const suppAdjRepTab = document.querySelector('[data-subview="supplier-adj-report"]');
                        if(suppAdjTab) suppAdjTab.style.display = 'none';
                        if(suppAdjRepTab) suppAdjRepTab.style.display = 'none';
                    }
                    renderAdjustmentListTable(); renderStockAdjustmentReport(); renderSupplierAdjustmentReport();
                    break;

                case 'internal-distribution':
                     populateOptions(document.getElementById('issue-from-branch'), state.branches, _t('select_a_branch'), 'branchCode', 'branchName');
                     populateOptions(document.getElementById('issue-to-section'), state.sections, _t('select_a_section'), 'sectionCode', 'sectionName');
                     if(document.getElementById('issue-ref')) document.getElementById('issue-ref').value = generateId('ISN');
                     renderRequestListTable(); renderMyRequests(); renderPendingRequests(); renderIssueListTable();
                     document.getElementById('consumption-branch-count').textContent = `${state.reportSelectedBranches.size} selected`;
                     document.getElementById('consumption-section-count').textContent = `${state.reportSelectedSections.size} selected`;
                     document.getElementById('consumption-item-count').textContent = `${state.reportSelectedItems.size} selected`;
                     break;

                case 'financials':
                    populateOptions(document.getElementById('payment-supplier-select'), state.suppliers, _t('select_supplier'), 'supplierCode', 'name');
                    populateOptions(document.getElementById('supplier-statement-select'), state.suppliers, _t('select_a_supplier'), 'supplierCode', 'name');
                    renderPaymentList();
                    if(document.getElementById('btn-select-invoices')) document.getElementById('btn-select-invoices').disabled = true;
                    break;
                    
                case 'purchasing':
                     populateOptions(document.getElementById('po-supplier'), state.suppliers, _t('select_supplier'), 'supplierCode', 'name');
                     if(document.getElementById('po-ref')) document.getElementById('po-ref').value = generateId('PO');
                     renderPOListTable(); renderPurchaseOrdersViewer(); renderPendingFinancials();
                     break;
                    
                case 'stock-levels':
                    const titleEl = document.getElementById('stock-levels-title');
                    if(titleEl) titleEl.textContent = userCan('viewAllBranches') ? _t('stock_by_item_all_branches') : _t('stock_by_item_your_branch');
                    const btnSelectBranches = document.getElementById('btn-stock-select-branches');
                    if (btnSelectBranches) btnSelectBranches.style.display = userCan('viewAllBranches') ? 'inline-flex' : 'none';
                    renderItemCentricStockView();
                    if(document.getElementById('item-inquiry-results')) document.getElementById('item-inquiry-results').innerHTML = '';
                    break;
                    
                case 'transaction-history': 
                    const txBranch = document.getElementById('tx-filter-branch');
                    populateOptions(txBranch, state.branches, _t('all_branches'), 'branchCode', 'branchName');
                    const txTypes = ['receive', 'issue', 'transfer_out', 'transfer_in', 'return_out', 'po', 'adjustment_in', 'adjustment_out', 'stock_adjustment'];
                    const txTypeOptions = txTypes.map(t => ({'type': t, 'name': _t(t.replace(/_/g,''))}));
                    const txType = document.getElementById('tx-filter-type');
                    populateOptions(txType, txTypeOptions, _t('all_types'), 'type', 'name');
                    state.pagination['table-transaction-history'].page = 1;
                    const txStartDate = document.getElementById('tx-filter-start-date');
                    const txEndDate = document.getElementById('tx-filter-end-date');
                    const txSearch = document.getElementById('transaction-search');
                    renderTransactionHistory({
                        startDate: txStartDate ? txStartDate.value : null,
                        endDate: txEndDate ? txEndDate.value : null,
                        type: txType ? txType.value : null,
                        branch: txBranch ? txBranch.value : null, 
                        searchTerm: txSearch ? txSearch.value : null
                    }); 
                    break;
                
                case 'master-data':
                    renderItemsTable(); renderSuppliersTable(); renderBranchesTable(); renderSectionsTable();
                    const companyTab = document.querySelector('[data-subview="company"]');
                    if(companyTab) {
                        if (userCan('manageUsers')) {
                            const form = document.getElementById('form-company-settings');
                            if(form && state.companySettings) {
                                for (const [key, value] of Object.entries(state.companySettings)) {
                                    if (form.elements[key]) form.elements[key].value = value;
                                }
                            }
                        } else {
                            companyTab.style.display = 'none';
                        }
                    }
                    break;

                case 'user-management':
                    const result = await postData('getAllUsersAndRoles', {}, null, 'Loading...');
                    if (result) { state.allUsers = result.data.users; state.allRoles = result.data.roles; renderUserManagementUI(); }
                    break;
                    
                case 'activity-log': renderActivityLog(); break;
                case 'backup': await loadAndRenderBackups(); await loadAutoBackupSettings(); break;
            }
            applyUserUIConstraints();
            applyTranslations();
            updatePendingRequestsWidget();
        } catch (e) {
            Logger.error(`Error refreshing view data for ${viewId}:`, e);
        }
    };

    window.reloadDataAndRefreshUI = async () => { 
        Logger.info('Reloading data...'); 
        const { username, loginCode } = state; 
        if (!username || !loginCode) return; 
        
        setButtonLoading(true, globalRefreshBtn, 'Loading...'); 
        try { 
            const response = await fetch(`${SCRIPT_URL}?username=${encodeURIComponent(username)}&loginCode=${encodeURIComponent(loginCode)}`); 
            if (!response.ok) throw new Error('Failed to reload data.'); 
            const data = await response.json(); 
            if (data.status === 'error') throw new Error(data.message); 
            
            Object.keys(data).forEach(key => { 
                if (key === 'user') return;
                // FIX: Ensure companySettings is strictly handled as an object for printing
                if (key === 'companySettings') {
                    if (Array.isArray(data[key])) {
                        state[key] = data[key].length > 0 ? data[key][0] : {};
                    } else {
                        state[key] = data[key] || {};
                    }
                } else {
                    state[key] = data[key] || state[key]; 
                }
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

    // --- NOTIFICATION BADGE UPDATE LOGIC ---
    async function updatePendingRequestsWidget() {
        if (!state.currentUser) return;

        // 1. Pending Internal Requests
        const pendingRequests = (state.itemRequests || []).filter(r => 
            r.Status === 'Pending' && 
            (userCan('viewAllBranches') || String(r.ToBranch) === String(state.currentUser.AssignedBranchCode))
        );
        const reqCount = pendingRequests.length;

        // 2. Incoming Transfers (In Transit)
        const incomingTransfers = (state.transactions || []).filter(t => 
            t.type === 'transfer_out' && 
            t.Status === 'In Transit' && 
            (userCan('viewAllBranches') || String(t.toBranchCode) === String(state.currentUser.AssignedBranchCode))
        );
        // Deduplicate by batchId for transfers
        const transferCount = new Set(incomingTransfers.map(t => t.batchId)).size;

        // 3. Update Sidebar Badges
        updateSidebarBadge('internal-distribution', reqCount);
        updateSidebarBadge('operations', transferCount);

        // 4. Update Dashboard Widget
        const widget = document.getElementById('pending-requests-widget');
        if (widget) {
            if (reqCount + transferCount > 0) {
                document.getElementById('pending-requests-count').textContent = reqCount + transferCount;
                widget.style.display = 'flex';
            } else {
                widget.style.display = 'none';
            }
        }
    }

    function updateSidebarBadge(viewId, count) {
        const link = document.querySelector(`a[data-view="${viewId}"]`);
        if (!link) return;
        
        let badge = link.querySelector('.nav-badge');
        if (count > 0) {
            if (!badge) {
                badge = document.createElement('span');
                badge.className = 'nav-badge';
                link.appendChild(badge);
            }
            badge.textContent = count;
            badge.style.display = 'inline-block';
        } else if (badge) {
            badge.remove();
        }
    }

    // =========================================================
    // 5. EVENT LISTENERS
    // =========================================================
    function attachEventListeners() {
        Logger.debug('Attaching global event listeners...');
        
        if(btnLogout) btnLogout.addEventListener('click', (e) => { e.preventDefault(); location.reload(); });
        if(globalRefreshBtn) globalRefreshBtn.addEventListener('click', reloadDataAndRefreshUI);
        
        document.querySelectorAll('#main-nav a:not(#btn-logout)').forEach(link => {
            link.addEventListener('click', e => {
                e.preventDefault();
                showView(link.dataset.view);
                if (window.innerWidth <= 768 && sidebar && overlay) { sidebar.classList.remove('open'); overlay.classList.remove('active'); document.body.classList.remove('menu-open'); }
            });
        });

        if (mobileMenuBtn && sidebar && overlay) {
            mobileMenuBtn.addEventListener('click', (e) => { e.stopPropagation(); sidebar.classList.toggle('open'); overlay.classList.toggle('active'); document.body.classList.toggle('menu-open'); });
            overlay.addEventListener('click', () => { sidebar.classList.remove('open'); overlay.classList.remove('active'); document.body.classList.remove('menu-open'); });
        }

        document.body.addEventListener('click', handleGlobalClicks);
        if(mainContent) mainContent.addEventListener('click', handleMainContentClicks);

        attachFormListeners();

        setupSearch('search-items', renderItemsTable, 'items', ['name', 'code', 'category']);
        setupSearch('search-suppliers', renderSuppliersTable, 'suppliers', ['name', 'supplierCode']);
        setupSearch('search-branches', renderBranchesTable, 'branches', ['branchName', 'branchCode']);
        setupSearch('search-sections', renderSectionsTable, 'sections', ['sectionName', 'sectionCode']);
        
        if(document.getElementById('btn-stock-select-items')) document.getElementById('btn-stock-select-items').addEventListener('click', () => openSelectionModal('stock-level-items'));
        if(document.getElementById('btn-stock-select-branches')) document.getElementById('btn-stock-select-branches').addEventListener('click', () => openSelectionModal('stock-level-branches'));
        if(document.getElementById('btn-open-item-inquiry')) document.getElementById('btn-open-item-inquiry').addEventListener('click', () => openSelectionModal('item-inquiry'));

        const exportMap = { 'btn-export-items': ['table-items', 'ItemList.xlsx'], 'btn-export-suppliers': ['table-suppliers', 'SupplierList.xlsx'], 'btn-export-branches': ['table-branches', 'BranchList.xlsx'], 'btn-export-sections': ['table-sections', 'SectionList.xlsx'], 'btn-export-stock': ['table-stock-levels-by-item', 'StockLevels.xlsx'], 'btn-export-supplier-statement': ['table-supplier-statement-report', 'SupplierStatement.xlsx'], 'btn-export-consumption-report': ['table-consumption-report', 'ConsumptionReport.xlsx'] };
        for (const [btnId, args] of Object.entries(exportMap)) { const btn = document.getElementById(btnId); if (btn) btn.addEventListener('click', () => exportToExcel(args[0], args[1])); }

        if (document.getElementById('btn-confirm-modal-selection')) document.getElementById('btn-confirm-modal-selection').addEventListener('click', confirmModalSelection);
        if (document.getElementById('btn-confirm-invoice-selection')) document.getElementById('btn-confirm-invoice-selection').addEventListener('click', confirmModalSelection);
        if (document.getElementById('invoice-selector-modal')) document.getElementById('invoice-selector-modal').addEventListener('change', handleInvoiceModalCheckboxChange);
        if (modalItemList) modalItemList.addEventListener('change', handleModalCheckboxChange);
        if (modalSearchInput) modalSearchInput.addEventListener('input', e => renderItemsInModal(e.target.value)); 
        if (formEditRecord) formEditRecord.addEventListener('submit', handleUpdateSubmit);

        // --- NEW: CONFIRM RECEIPT LISTENERS ---
        if (document.getElementById('btn-confirm-receive-transfer')) document.getElementById('btn-confirm-receive-transfer').addEventListener('click', handleConfirmReceiveTransfer);
        if (document.getElementById('btn-reject-transfer')) document.getElementById('btn-reject-transfer').addEventListener('click', handleRejectTransfer);
        // --------------------------------------

        if(document.getElementById('auto-backup-toggle')) document.getElementById('auto-backup-toggle').addEventListener('change', handleAutoBackupToggle);
        if(document.getElementById('auto-backup-frequency')) document.getElementById('auto-backup-frequency').addEventListener('change', handleAutoBackupToggle);
        
        if (document.getElementById('btn-create-backup')) {
            document.getElementById('btn-create-backup').addEventListener('click', async (e) => {
                if (confirm(_t('backup_confirm_prompt'))) {
                    const result = await postData('createBackup', {}, e.currentTarget, 'Creating...');
                    if (result && result.data) { showToast(_t('backup_created_toast', {fileName: result.data.fileName}), 'success'); await loadAndRenderBackups(); }
                }
            });
        }
        
        if (document.getElementById('backup-list-container')) {
            document.getElementById('backup-list-container').addEventListener('click', (e) => {
                const btn = e.target.closest('button');
                if (btn && btn.classList.contains('btn-restore')) {
                    const backupFileId = findByKey(state.backups, 'url', btn.dataset.url)?.id;
                    const backupFileName = findByKey(state.backups, 'url', btn.dataset.url)?.name;
                    if (backupFileId) openRestoreModal(backupFileId, backupFileName);
                }
            });
        }
        if(document.getElementById('btn-confirm-restore')) document.getElementById('btn-confirm-restore').addEventListener('click', handleConfirmRestore);
        if(document.getElementById('btn-confirm-context')) document.getElementById('btn-confirm-context').addEventListener('click', confirmContextSelection);
        if(document.getElementById('btn-confirm-report-selection')) document.getElementById('btn-confirm-report-selection').addEventListener('click', confirmReportSelection);
        if(document.getElementById('selection-modal-search')) document.getElementById('selection-modal-search').addEventListener('input', e => renderSelectionModalContent(e.target.value));
        
        if(document.getElementById('selection-modal-list')) {
            document.getElementById('selection-modal-list').addEventListener('change', e => {
                if (e.target.type === 'checkbox') { if (e.target.checked) state.currentSelectionModal.tempSelections.add(e.target.dataset.id); else state.currentSelectionModal.tempSelections.delete(e.target.dataset.id); }
            });
        }
        
        document.getElementById('selection-modal-select-all')?.addEventListener('click', () => { document.querySelectorAll('#selection-modal-list input[type="checkbox"]').forEach(cb => { cb.checked = true; state.currentSelectionModal.tempSelections.add(cb.dataset.id); }); });
        document.getElementById('selection-modal-deselect-all')?.addEventListener('click', () => { document.querySelectorAll('#selection-modal-list input[type="checkbox"]').forEach(cb => { cb.checked = false; state.currentSelectionModal.tempSelections.delete(cb.dataset.id); }); });
        
        ['tx-filter-start-date', 'tx-filter-end-date', 'tx-filter-type', 'tx-filter-branch', 'transaction-search'].forEach(id => {
            const el = document.getElementById(id);
            if(el) {
                const eventType = (el.tagName === 'SELECT' || el.type === 'date') ? 'change' : 'input';
                el.addEventListener(eventType, () => {
                    state.pagination['table-transaction-history'].page = 1;
                    renderTransactionHistory({
                        startDate: document.getElementById('tx-filter-start-date')?.value,
                        endDate: document.getElementById('tx-filter-end-date')?.value,
                        type: document.getElementById('tx-filter-type')?.value,
                        branch: document.getElementById('tx-filter-branch')?.value,
                        searchTerm: document.getElementById('transaction-search')?.value
                    });
                });
            }
        });
    }

    function setupPaginationListeners() {
        document.addEventListener('click', (e) => {
            if (e.target.matches('.pagination-btn')) {
                const tableId = e.target.dataset.table;
                handlePageChange(tableId, parseInt(e.target.dataset.delta));
            }
        });
    }

    function handlePageChange(tableId, delta) {
        if (!state.pagination[tableId]) return;
        state.pagination[tableId].page += delta;
        if (state.pagination[tableId].page < 1) state.pagination[tableId].page = 1;
        if(tableId === 'table-transaction-history') {
             renderTransactionHistory({
                startDate: document.getElementById('tx-filter-start-date')?.value,
                endDate: document.getElementById('tx-filter-end-date')?.value,
                type: document.getElementById('tx-filter-type')?.value,
                branch: document.getElementById('tx-filter-branch')?.value,
                searchTerm: document.getElementById('transaction-search')?.value
            });
        } else if (tableId === 'table-items') renderItemsTable();
        else if (tableId === 'table-suppliers') renderSuppliersTable();
        else if (tableId === 'table-activity-log') renderActivityLog();
        else if (tableId === 'table-po-viewer') renderPurchaseOrdersViewer();
        else if (tableId === 'table-my-requests-history') renderMyRequests();
        else if (tableId === 'table-stock-adj-report') renderStockAdjustmentReport();
        else if (tableId === 'table-supplier-adj-report') renderSupplierAdjustmentReport();
    }

    // --- FIX: ROBUST SUB-TAB LISTENER ---
    function attachSubNavListeners() {
        document.body.addEventListener('click', e => {
            const btn = e.target.closest('.sub-nav-item');
            if (!btn || btn.closest('#history-modal')) return;
            e.preventDefault();
            const subviewId = btn.dataset.subview;
            const parentView = btn.closest('.view');
            if (!parentView) return;
            
            Logger.info(`Sub-tab clicked: ${subviewId} in ${parentView.id}`);

            // Update UI buttons
            parentView.querySelectorAll('.sub-nav-item').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Update Views
            parentView.querySelectorAll('.sub-view').forEach(view => view.classList.remove('active'));
            const subViewToShow = parentView.querySelector(`#subview-${subviewId}`);
            if (subViewToShow) {
                subViewToShow.classList.add('active');
                refreshViewData(parentView.id.replace('view-', ''));
            }
        });
    }

    function attachFormListeners() {
        const addItemForm = document.getElementById('form-add-item');
        if (addItemForm) {
            addItemForm.addEventListener('submit', async e => {
                e.preventDefault(); const btn = e.target.querySelector('button[type="submit"]'); const data = { code: document.getElementById('item-code').value, barcode: document.getElementById('item-barcode').value, name: document.getElementById('item-name').value, unit: document.getElementById('item-unit').value, category: document.getElementById('item-category').value, supplierCode: document.getElementById('item-supplier').value, cost: parseFloat(document.getElementById('item-cost').value) }; const result = await postData('addItem', data, btn, 'Saving...'); if (result) { showToast(_t('add_success_toast', {type: _t('item')}), 'success'); e.target.reset(); reloadDataAndRefreshUI(); }
            });
        }
        if (document.getElementById('form-add-supplier')) { document.getElementById('form-add-supplier').addEventListener('submit', async e => { e.preventDefault(); const btn = e.target.querySelector('button[type="submit"]'); const data = { supplierCode: document.getElementById('supplier-code').value, name: document.getElementById('supplier-name').value, contact: document.getElementById('supplier-contact').value }; const result = await postData('addSupplier', data, btn, 'Saving...'); if (result) { showToast(_t('add_success_toast', {type: _t('supplier')}), 'success'); e.target.reset(); reloadDataAndRefreshUI(); } }); }
        if (document.getElementById('form-add-branch')) { document.getElementById('form-add-branch').addEventListener('submit', async e => { e.preventDefault(); const btn = e.target.querySelector('button[type="submit"]'); const data = { branchCode: document.getElementById('branch-code').value, branchName: document.getElementById('branch-name').value }; const result = await postData('addBranch', data, btn, 'Saving...'); if (result) { showToast(_t('add_success_toast', {type: _t('branch')}), 'success'); e.target.reset(); reloadDataAndRefreshUI(); } }); }
        if (document.getElementById('form-add-section')) { document.getElementById('form-add-section').addEventListener('submit', async e => { e.preventDefault(); const btn = e.target.querySelector('button[type="submit"]'); const data = { sectionCode: document.getElementById('section-code').value, sectionName: document.getElementById('section-name').value }; const result = await postData('addSection', data, btn, 'Saving...'); if (result) { showToast(_t('add_success_toast', {type: _t('section')}), 'success'); e.target.reset(); reloadDataAndRefreshUI(); } }); }

        if (document.getElementById('btn-submit-receive-batch')) document.getElementById('btn-submit-receive-batch').addEventListener('click', async (e) => { const btn = e.currentTarget; let branchCode = document.getElementById('receive-branch').value; const supplierCode = document.getElementById('receive-supplier').value, invoiceNumber = document.getElementById('receive-invoice').value, notes = document.getElementById('receive-notes').value, poId = document.getElementById('receive-po-select').value; if(userCan('viewAllBranches') && !state.currentUser.AssignedBranchCode) { const context = await requestAdminContext({ branch: true }); if(!context) return; branchCode = context.branch; } if (!userCan('opReceiveWithoutPO') && !poId) { showToast(_t('select_po_first_toast'), 'error'); return; } if (!supplierCode || !branchCode || !invoiceNumber || state.currentReceiveList.length === 0) { showToast(_t('fill_required_fields_toast'), 'error'); return; } const payload = { type: 'receive', batchId: `GRN-${Date.now()}`, supplierCode, branchCode, invoiceNumber, poId, date: new Date().toISOString(), items: state.currentReceiveList.map(i => ({...i, type: 'receive'})), notes }; await handleTransactionSubmit(payload, btn); });
        if(document.getElementById('btn-submit-transfer-batch')) document.getElementById('btn-submit-transfer-batch').addEventListener('click', async (e) => { const btn = e.currentTarget; let fromBranchCode = document.getElementById('transfer-from-branch').value, toBranchCode = document.getElementById('transfer-to-branch').value; const notes = document.getElementById('transfer-notes').value, ref = document.getElementById('transfer-ref').value; if(userCan('viewAllBranches') && !state.currentUser.AssignedBranchCode) { const context = await requestAdminContext({ fromBranch: true, toBranch: true }); if(!context) return; fromBranchCode = context.fromBranch; toBranchCode = context.toBranch; } if (!fromBranchCode || !toBranchCode || fromBranchCode === toBranchCode || state.currentTransferList.length === 0) { showToast('Please select valid branches and add at least one item.', 'error'); return; } const payload = { type: 'transfer_out', batchId: ref, ref: ref, fromBranchCode, toBranchCode, date: new Date().toISOString(), items: state.currentTransferList.map(i => ({...i, type: 'transfer_out'})), notes }; await handleTransactionSubmit(payload, btn); });
        if(document.getElementById('btn-submit-issue-batch')) document.getElementById('btn-submit-issue-batch').addEventListener('click', async(e) => { const btn = e.currentTarget; let fromBranchCode = document.getElementById('issue-from-branch').value, sectionCode = document.getElementById('issue-to-section').value; const ref = document.getElementById('issue-ref').value, notes = document.getElementById('issue-notes').value; if(userCan('viewAllBranches') && !state.currentUser.AssignedBranchCode) { const context = await requestAdminContext({ fromBranch: true, toSection: true }); if(!context) return; fromBranchCode = context.fromBranch; sectionCode = context.toSection; } if (!fromBranchCode || !sectionCode || !ref || state.currentIssueList.length === 0) { showToast('Please fill all issue details and select at least one item.', 'error'); return; } const payload = { type: 'issue', batchId: ref, ref: ref, fromBranchCode, sectionCode, date: new Date().toISOString(), items: state.currentIssueList.map(i => ({...i, type: 'issue'})), notes }; await handleTransactionSubmit(payload, btn); });
        if(document.getElementById('btn-submit-po')) document.getElementById('btn-submit-po').addEventListener('click', async (e) => { const btn = e.currentTarget; const supplierCode = document.getElementById('po-supplier').value, poId = document.getElementById('po-ref').value, notes = document.getElementById('po-notes').value; if (!supplierCode || state.currentPOList.length === 0) { showToast('Please select a supplier and add items.', 'error'); return; } const totalValue = state.currentPOList.reduce((acc, item) => acc + ((parseFloat(item.quantity) || 0) * (parseFloat(item.cost) || 0)), 0); const payload = { type: 'po', poId, supplierCode, date: new Date().toISOString(), items: state.currentPOList, totalValue, notes }; await handleTransactionSubmit(payload, btn); });
        if(document.getElementById('btn-submit-return')) document.getElementById('btn-submit-return').addEventListener('click', async (e) => { const btn = e.currentTarget; const supplierCode = document.getElementById('return-supplier').value; let fromBranchCode = document.getElementById('return-branch').value; const ref = document.getElementById('return-ref').value, notes = document.getElementById('return-notes').value; if(userCan('viewAllBranches') && !state.currentUser.AssignedBranchCode) { const context = await requestAdminContext({ fromBranch: true }); if(!context) return; fromBranchCode = context.fromBranch; } if (!supplierCode || !fromBranchCode || !ref || state.currentReturnList.length === 0) { showToast('Please fill all required fields and add items.', 'error'); return; } const payload = { type: 'return_out', batchId: `RTN-${Date.now()}`, ref: ref, supplierCode, fromBranchCode, date: new Date().toISOString(), items: state.currentReturnList.map(i => ({...i, type: 'return_out'})), notes }; await handleTransactionSubmit(payload, btn); });
        if(document.getElementById('btn-submit-request')) document.getElementById('btn-submit-request').addEventListener('click', async(e) => { const btn = e.currentTarget; let fromSection = state.currentUser.AssignedSectionCode, toBranch = state.currentUser.AssignedBranchCode; const requestType = document.getElementById('request-type').value; const notes = document.getElementById('request-notes').value; if(userCan('viewAllBranches') && !state.currentUser.AssignedBranchCode) { const context = await requestAdminContext({ toBranch: true, fromSection: true }); if(!context) return; fromSection = context.fromSection; toBranch = context.toBranch; } if(state.currentRequestList.length === 0){ showToast('Please select items for your request.', 'error'); return; } if(!fromSection || !toBranch){ showToast('Your user is not assigned a branch/section to make requests. Please contact an admin.', 'error'); return; } const payload = { requestId: `REQ-${Date.now()}`, requestType, notes, items: state.currentRequestList, FromSection: fromSection, ToBranch: toBranch }; const result = await postData('addItemRequest', payload, btn, 'Submitting...'); if(result){ showToast('Request submitted successfully!', 'success'); state.currentRequestList = []; document.getElementById('form-create-request').reset(); renderRequestListTable(); reloadDataAndRefreshUI(); }});
        
        if(document.getElementById('btn-submit-adjustment')) document.getElementById('btn-submit-adjustment').addEventListener('click', async (e) => {
            const btn = e.currentTarget; let branchCode = document.getElementById('adjustment-branch').value; const ref = document.getElementById('adjustment-ref').value; const notes = document.getElementById('adjustment-notes').value;
            if(userCan('viewAllBranches') && !state.currentUser.AssignedBranchCode) { const context = await requestAdminContext({ branch: true }); if(!context) return; branchCode = context.branch; }
            if (!branchCode || !ref || !state.currentAdjustmentList || state.currentAdjustmentList.length === 0) { showToast('Please select a branch, provide a reference, and add items to adjust.', 'error'); return; }
            const stock = calculateStockLevels();
            const adjustmentItems = state.currentAdjustmentList.map(item => {
                const systemQty = (stock[branchCode]?.[item.itemCode]?.quantity) || 0; const physicalCount = item.physicalCount || 0; const adjustmentQty = physicalCount - systemQty;
                if (Math.abs(adjustmentQty) < 0.01) return null;
                return { itemCode: item.itemCode, quantity: Math.abs(adjustmentQty), type: adjustmentQty > 0 ? 'adjustment_in' : 'adjustment_out', cost: findByKey(state.items, 'code', item.itemCode)?.cost || 0 };
            }).filter(Boolean);
            if (adjustmentItems.length === 0) { showToast('No adjustments needed.', 'info'); return; }
            const payload = { type: 'stock_adjustment', batchId: `ADJ-${Date.now()}`, ref: ref, fromBranchCode: branchCode, notes: notes, items: adjustmentItems };
            await handleTransactionSubmit(payload, btn); state.currentAdjustmentList = []; renderAdjustmentListTable(); document.getElementById('form-adjustment-details').reset();
        });
        
        if(document.getElementById('form-record-payment')) document.getElementById('form-record-payment').addEventListener('submit', async e => { e.preventDefault(); const btn = e.target.querySelector('button[type="submit"]'); const supplierCode = document.getElementById('payment-supplier-select').value; const method = document.getElementById('payment-method').value; if (!supplierCode || state.invoiceModalSelections.size === 0) { showToast('Please select supplier and invoices.', 'error'); return; } const paymentId = `PAY-${Date.now()}`; let totalAmount = 0; const payments = []; document.querySelectorAll('.payment-amount-input').forEach(input => { const amount = parseFloat(input.value) || 0; if (amount > 0) { totalAmount += amount; payments.push({ paymentId, date: new Date().toISOString(), supplierCode, invoiceNumber: input.dataset.invoice, amount, method }); } }); if (payments.length === 0) { showToast('Amount must be greater than zero.', 'error'); return; } const payload = { supplierCode, method, date: new Date().toISOString(), totalAmount, payments }; const result = await postData('addPaymentBatch', payload, btn, 'Processing...'); if (result) { showToast('Payment recorded!', 'success'); generatePaymentVoucher(payload); state.invoiceModalSelections.clear(); document.getElementById('form-record-payment').reset(); renderPaymentList(); reloadDataAndRefreshUI(); }});
        if(document.getElementById('form-financial-adjustment')) document.getElementById('form-financial-adjustment').addEventListener('submit', async(e) => { e.preventDefault(); const btn = e.target.querySelector('button[type="submit"]'); const supplierCode = document.getElementById('fin-adj-supplier').value; const balance = parseFloat(document.getElementById('fin-adj-balance').value); if (!supplierCode || isNaN(balance) || balance < 0) { showToast('Please select a supplier and enter a valid opening balance.', 'error'); return; } if (!confirm(`Are you sure you want to set the opening balance for this supplier to ${balance.toFixed(2)} EGP? This should only be done once.`)) { return; } const payload = { supplierCode: supplierCode, balance: balance, ref: `OB-${supplierCode}` }; const result = await postData('financialAdjustment', payload, btn, 'Saving...'); if (result) { showToast('Supplier opening balance set successfully!', 'success'); e.target.reset(); await reloadDataAndRefreshUI(); }});
        if(document.getElementById('form-company-settings')) document.getElementById('form-company-settings').addEventListener('submit', async e => { e.preventDefault(); const btn = e.target.querySelector('button[type="submit"]'); const formData = new FormData(e.target); const data = Object.fromEntries(formData.entries()); if(await postData('updateCompanySettings', data, btn, 'Saving...')) { state.companySettings = data; showToast('Company settings saved!', 'success'); }});

        setupInputTableListeners('table-receive-list', 'currentReceiveList', renderReceiveListTable);
        setupInputTableListeners('table-transfer-list', 'currentTransferList', renderTransferListTable);
        setupInputTableListeners('table-issue-list', 'currentIssueList', renderIssueListTable);
        setupInputTableListeners('table-po-list', 'currentPOList', renderPOListTable);
        setupInputTableListeners('table-edit-po-list', 'currentEditingPOList', renderPOEditListTable);
        setupInputTableListeners('table-return-list', 'currentReturnList', renderReturnListTable);
        setupInputTableListeners('table-request-list', 'currentRequestList', renderRequestListTable);
        setupInputTableListeners('table-adjustment-list', 'currentAdjustmentList', renderAdjustmentListTable);
    }

    function handleGlobalClicks(e) { }

    function handleMainContentClicks(e) {
        const btn = e.target.closest('button');
        if (!btn) return;
        if (btn.classList.contains('btn-add-new')) openEditModal(btn.dataset.type, null);
        if (btn.dataset.context) openItemSelectorModal(e);
        if (btn.dataset.selectionType) openSelectionModal(btn.dataset.selectionType);
        if (btn.id === 'btn-select-invoices') openInvoiceSelectorModal();
        if (btn.classList.contains('btn-edit')) openEditModal(btn.dataset.type, btn.dataset.id);
        if (btn.classList.contains('btn-history')) openHistoryModal(btn.dataset.id);
        if (btn.id === 'btn-add-new-user') openEditModal('user', null);
        if (btn.id === 'btn-add-new-role') { const roleName = prompt(_t('add_role_prompt')); if(roleName) { postData('addRole', { RoleName: roleName }, btn, 'Adding...').then(res => res && reloadDataAndRefreshUI()); } }
        
        if (btn.classList.contains('btn-view-tx')) {
             const batchId = btn.dataset.batchId; const type = btn.dataset.type;
             if (type === 'po') {
                 const data = findByKey(state.purchaseOrders, 'poId', batchId);
                 const items = (state.purchaseOrderItems || []).filter(i => i.poId === batchId);
                 if (data && items) generatePODocument({ ...data, items });
             } else if (type === 'adjustment') {
                 const group = state.transactions.filter(t => t.batchId === batchId);
                 if(group.length) generateAdjustmentDocument({ ...group[0], items: group });
             } else if (type === 'issue') {
                  const group = state.itemRequests.filter(r => r.RequestID === batchId);
                  if (group.length > 0) {
                      const first = group[0];
                      const items = group.map(r => ({ itemCode: r.ItemCode, quantity: r.IssuedQuantity || r.Quantity }));
                      generateRequestIssueDocument({ ref: first.RequestID, date: first.Date, fromBranchCode: first.FromSection, sectionCode: first.ToBranch, items: items, notes: first.StatusNotes });
                  } else {
                      const transactionGroup = state.transactions.filter(t => t.batchId === batchId);
                       if (transactionGroup.length > 0) {
                             const first = transactionGroup[0];
                             const data = { ...first, items: transactionGroup.map(t => ({...t, itemName: findByKey(state.items, 'code', t.itemCode)?.name })) };
                             generateIssueDocument(data);
                       }
                  }
             } else {
                 const transactionGroup = state.transactions.filter(t => t.batchId === batchId);
                 if (transactionGroup.length > 0) {
                     const first = transactionGroup[0];
                     const data = { ...first, items: transactionGroup.map(t => ({...t, itemName: findByKey(state.items, 'code', t.itemCode)?.name })) };
                     if (type === 'receive') generateReceiveDocument(data);
                     else if (type.startsWith('transfer')) generateTransferDocument(data);
                     else if (type === 'return_out') generateReturnDocument(data);
                 }
             }
        }
        
        if (btn.classList.contains('btn-print-supplier-adj')) { const p = findByKey(state.payments, 'paymentId', btn.dataset.id) || findByKey(state.payments, 'invoiceNumber', btn.dataset.id); if(p) generatePaymentVoucher({payments:[p], ...p}); }
        if (btn.classList.contains('btn-receive-transfer')) openViewTransferModal(btn.dataset.batchId);
        if (btn.classList.contains('btn-edit-transfer')) openPOEditModal(btn.dataset.batchId); 
        if (btn.classList.contains('btn-cancel-transfer')) { const batchId = btn.dataset.batchId; if (confirm(`Cancel transfer ${batchId}?`)) { postData('cancelTransfer', { batchId }, btn, 'Cancelling...').then(res => res && reloadDataAndRefreshUI()); } }
        if (btn.classList.contains('btn-approve-request')) openApproveRequestModal(btn.dataset.id); 
        if (btn.classList.contains('btn-reject-request')) { if(confirm('Reject request?')) postData('rejectItemRequest', { requestId: btn.dataset.id }, btn, 'Rejecting...').then(res => res && reloadDataAndRefreshUI()); }
        if (btn.classList.contains('btn-edit-po')) openPOEditModal(btn.dataset.poId);
        if (btn.classList.contains('btn-edit-invoice')) openInvoiceEditModal(btn.dataset.batchId);
        if (btn.classList.contains('btn-approve-financial') || btn.classList.contains('btn-reject-financial')) { const id = btn.dataset.id, type = btn.dataset.type, action = btn.classList.contains('btn-approve-financial') ? 'approveFinancial' : 'rejectFinancial'; if (confirm(`Confirm ${action.replace('Financial','')} for ${type}?`)) { postData(action, { id, type }, btn, 'Processing...').then(res => { if(res) { showToast('Processed successfully', 'success'); reloadDataAndRefreshUI(); } }); } }
        if (btn.id === 'btn-generate-supplier-statement') renderSupplierStatement(document.getElementById('supplier-statement-select').value, document.getElementById('statement-start-date').value, document.getElementById('statement-end-date').value);
        if (btn.id === 'btn-generate-consumption-report') renderUnifiedConsumptionReport();
        if (btn.id === 'btn-print-pending-requests') window.printReport('subview-pending-approval');
    }

    async function handleTransactionSubmit(payload, buttonEl) {
        const action = payload.type === 'po' ? 'addPurchaseOrder' : 'addTransactionBatch';
        const result = await postData(action, payload, buttonEl, 'Submitting...');
        if (result) {
            const typeKey = payload.type.replace(/_/g,'');
            if (payload.type === 'receive') { state.currentReceiveList = []; document.getElementById('form-receive-details').reset(); renderReceiveListTable(); }
            else if (payload.type === 'transfer_out') { generateTransferDocument(result.data); state.currentTransferList = []; document.getElementById('form-transfer-details').reset(); document.getElementById('transfer-ref').value = generateId('TRN'); renderTransferListTable(); }
            else if (payload.type === 'issue') { generateIssueDocument(result.data); state.currentIssueList = []; document.getElementById('form-issue-details').reset(); document.getElementById('issue-ref').value = generateId('ISN'); renderIssueListTable(); }
            else if (payload.type === 'po') { state.currentPOList = []; document.getElementById('form-po-details').reset(); document.getElementById('po-ref').value = generateId('PO'); renderPOListTable(); }
            else if (payload.type === 'return_out') { generateReturnDocument(result.data); state.currentReturnList = []; document.getElementById('form-return-details').reset(); renderReturnListTable(); }
            else if (payload.type === 'stock_adjustment') { generateAdjustmentDocument(result.data); }
            showToast(_t('tx_processed_toast', {txType: _t(typeKey)}), 'success');
            await reloadDataAndRefreshUI();
        }
    }

    // --- NEW HANDLERS FOR CONFIRM RECEIPT MODAL ---
    
    function openViewTransferModal(batchId) {
        const txs = state.transactions.filter(t => t.batchId === batchId);
        if (!txs.length) return;

        const first = txs[0];
        const fromBranch = findByKey(state.branches, 'branchCode', first.fromBranchCode)?.branchName || first.fromBranchCode;
        const toBranch = findByKey(state.branches, 'branchCode', first.toBranchCode)?.branchName || first.toBranchCode;
        const dateSent = new Date(first.date).toLocaleString();

        let html = `
        <div style="background-color: #f8fafc; padding: 16px; border-radius: 12px; margin-bottom: 20px; border: 1px solid #e2e8f0;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 14px;">
                <div><span style="color: #64748b; font-weight: 600;">From Branch:</span> <div style="font-weight: 700;">${fromBranch}</div></div>
                <div><span style="color: #64748b; font-weight: 600;">To Branch:</span> <div style="font-weight: 700;">${toBranch}</div></div>
                <div style="grid-column: 1/-1;"><span style="color: #64748b; font-weight: 600;">Date Sent:</span> <div style="font-weight: 700;">${dateSent}</div></div>
            </div>
        </div>
        <div class="table-responsive">
            <table>
                <thead>
                    <tr>
                        <th style="width: 25%;">${_t('table_h_code')}</th>
                        <th style="width: 50%;">${_t('item_name')}</th>
                        <th style="width: 25%;">${_t('table_h_quantity')}</th>
                    </tr>
                </thead>
                <tbody>`;
        
        txs.forEach(t => {
            const itemDef = findByKey(state.items, 'code', t.itemCode);
            const itemName = itemDef ? itemDef.name : '<span style="color:red">Unknown Item</span>';
            const qty = parseFloat(t.quantity);
            const displayQty = isNaN(qty) ? '0.00' : qty.toFixed(2);
            
            html += `<tr>
                <td style="font-weight: 600; color: var(--primary-color);">${t.itemCode}</td>
                <td>${itemName}</td>
                <td style="font-weight: 700; font-size: 15px;">${displayQty}</td>
            </tr>`;
        });

        html += `</tbody></table></div>`;
        document.getElementById('view-transfer-modal-body').innerHTML = html;
        document.getElementById('view-transfer-modal-title').textContent = `${_t('confirm_receipt')}: ${first.ref || batchId}`;
        
        // Store ID for the action buttons
        document.getElementById('btn-confirm-receive-transfer').dataset.batchId = batchId;
        document.getElementById('btn-reject-transfer').dataset.batchId = batchId;
        
        viewTransferModal.classList.add('active');
    }

    async function handleConfirmReceiveTransfer(e) {
        const btn = e.currentTarget;
        const batchId = btn.dataset.batchId;
        const txs = state.transactions.filter(t => t.batchId === batchId);
        if (!txs.length) return;
        const first = txs[0];

        const payload = {
            originalBatchId: batchId,
            fromBranchCode: first.fromBranchCode,
            toBranchCode: first.toBranchCode,
            ref: first.ref,
            notes: first.notes,
            items: txs.map(t => ({ itemCode: t.itemCode, quantity: t.quantity }))
        };

        const result = await postData('receiveTransfer', payload, btn, 'Confirming...');
        if (result) {
            showToast('Transfer Received Successfully!', 'success');
            viewTransferModal.classList.remove('active'); // Close modal
            reloadDataAndRefreshUI();
        }
    }

    async function handleRejectTransfer(e) {
        if (!confirm('Are you sure you want to reject this transfer? This action cannot be undone.')) return;
        const btn = e.currentTarget;
        const batchId = btn.dataset.batchId;
        const result = await postData('rejectTransfer', { batchId }, btn, 'Rejecting...');
        if (result) {
            showToast('Transfer Rejected', 'success');
            viewTransferModal.classList.remove('active'); // Close modal
            reloadDataAndRefreshUI();
        }
    }

    // [Standard Modal Functions Below]

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
        if(await postData('editInvoice', payload, btn, 'Saving...')) { showToast('Invoice updated', 'success'); closeModal(); reloadDataAndRefreshUI(); }
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
            await postData('restoreFromBackup', { backupFileId: fileId, sheetsToRestore: sheets }, e.target, 'Restoring...');
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

    function openSelectionModal(type) {
        state.currentSelectionModal.type = type;
        const listEl = document.getElementById('selection-modal-list');
        listEl.innerHTML = '';
        let data = [];
        let existingSet = new Set();
        
        // Map types to data sources and state sets
        if(type === 'branches') { 
            data = state.branches.map(b => ({id: b.branchCode, name: b.branchName}));
            existingSet = state.reportSelectedBranches;
        } else if(type === 'sections') { 
            data = state.sections.map(s => ({id: s.sectionCode, name: s.sectionName}));
            existingSet = state.reportSelectedSections;
        } else if(type === 'items') { 
            data = state.items.map(i => ({id: i.code, name: i.name}));
            existingSet = state.reportSelectedItems;
        } else if (type === 'stock-level-items') {
            data = state.items.map(i => ({id: i.code, name: i.name}));
            existingSet = new Set(); 
        } else if (type === 'stock-level-branches') {
             data = state.branches.map(b => ({id: b.branchCode, name: b.branchName}));
             existingSet = new Set(); 
        } else if (type === 'item-inquiry') {
            data = state.items.map(i => ({id: i.code, name: i.name}));
            existingSet = new Set(); 
        }

        // Pre-fill temp selections from existing state
        state.currentSelectionModal.tempSelections = new Set(existingSet);

        data.forEach(item => {
            const div = document.createElement('div'); div.className = 'modal-item';
            div.innerHTML = `<input type="checkbox" data-id="${item.id}" ${state.currentSelectionModal.tempSelections.has(item.id) ? 'checked' : ''}><label>${item.name}</label>`;
            
            // Allow row click to toggle checkbox
            div.addEventListener('click', e => {
                 if (e.target.type !== 'checkbox') {
                     const cb = div.querySelector('input[type="checkbox"]');
                     cb.checked = !cb.checked;
                     cb.dispatchEvent(new Event('change', { bubbles: true }));
                 }
            });
            
            listEl.appendChild(div);
        });
        selectionModal.classList.add('active');
    }

    function confirmReportSelection() {
        const type = state.currentSelectionModal.type;
        const set = state.currentSelectionModal.tempSelections;
        
        if(type === 'branches') {
            state.reportSelectedBranches = new Set(set);
            document.getElementById('consumption-branch-count').textContent = `${set.size} selected`;
        } else if(type === 'sections') {
            state.reportSelectedSections = new Set(set);
            document.getElementById('consumption-section-count').textContent = `${set.size} selected`;
        } else if(type === 'items') {
            state.reportSelectedItems = new Set(set);
            document.getElementById('consumption-item-count').textContent = `${set.size} selected`;
        } else if(type === 'stock-level-items') {
             const selectedItems = Array.from(set).map(id => findByKey(state.items, 'code', id));
             renderItemCentricStockView(selectedItems.length > 0 ? selectedItems : state.items);
        } else if(type === 'stock-level-branches') {
             const selectedBranches = Array.from(set).map(id => findByKey(state.branches, 'branchCode', id));
             renderItemCentricStockView(state.items, selectedBranches);
        } else if (type === 'item-inquiry') {
             if(set.size > 0) {
                 const itemId = Array.from(set)[0];
                 const item = findByKey(state.items, 'code', itemId);
                 if(item) {
                     document.getElementById('btn-open-item-inquiry').querySelector('span').textContent = item.name;
                     renderItemInquiry(item.code.toLowerCase());
                 }
             }
        }
        
        closeModal();
    }

    function renderSelectionModalContent(filter) {
        const listEl = document.getElementById('selection-modal-list');
        listEl.innerHTML = '';
        const type = state.currentSelectionModal.type;
        const lowerFilter = filter.toLowerCase();
        let data = [];
        
        if(type.includes('branches')) data = state.branches.map(b => ({id: b.branchCode, name: b.branchName}));
        if(type.includes('sections')) data = state.sections.map(s => ({id: s.sectionCode, name: s.sectionName}));
        if(type.includes('items') || type === 'item-inquiry') data = state.items.map(i => ({id: i.code, name: i.name}));
        
        data.filter(i => i.name.toLowerCase().includes(lowerFilter)).forEach(item => {
            const div = document.createElement('div'); div.className = 'modal-item';
            div.innerHTML = `<input type="checkbox" data-id="${item.id}" ${state.currentSelectionModal.tempSelections.has(item.id) ? 'checked' : ''}><label>${item.name}</label>`;
            div.addEventListener('click', e => {
                 if (e.target.type !== 'checkbox') {
                     const cb = div.querySelector('input[type="checkbox"]');
                     cb.checked = !cb.checked;
                     cb.dispatchEvent(new Event('change', { bubbles: true }));
                 }
            });
            listEl.appendChild(div);
        });
    }

    async function loadAndRenderBackups() {
        const container = document.getElementById('backup-list-container');
        container.innerHTML = '<div class="spinner"></div>';
        const res = await postData('listBackups', {}, null, 'Loading...');
        if(res && res.data) {
            state.backups = res.data;
            container.innerHTML = state.backups.length ? `<table><tbody>${state.backups.map(b => `<tr><td>${b.name}</td><td>${new Date(b.dateCreated).toLocaleDateString()}</td><td><button class="danger small btn-restore" data-url="${b.url}">Restore</button></td></tr>`).join('')}</tbody></table>` : '<p>No backups found.</p>';
        }
    }

    async function loadAutoBackupSettings() {
        const res = await postData('getAutomaticBackupStatus', {}, null, 'Loading...');
        if(res && res.data) {
            document.getElementById('auto-backup-toggle').checked = res.data.enabled;
            document.getElementById('auto-backup-frequency-container').style.display = res.data.enabled ? 'block' : 'none';
        }
    }

    async function handleAutoBackupToggle() {
        const enabled = document.getElementById('auto-backup-toggle').checked;
        const frequency = document.getElementById('auto-backup-frequency').value;
        document.getElementById('auto-backup-frequency-container').style.display = enabled ? 'block' : 'none';
        await postData('setAutomaticBackup', { enabled, frequency }, null, 'Updating...');
        showToast('Backup settings updated', 'success');
    }

    init();
});
