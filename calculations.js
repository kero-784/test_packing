const calculateStockLevels = () => {
    const stock = {};
    (state.branches || []).forEach(branch => { stock[branch.branchCode] = {}; });
    const sortedTransactions = [...(state.transactions || [])].sort((a, b) => new Date(a.date) - new Date(b.date));
    const tempAvgCosts = {};
    sortedTransactions.forEach(t => {
        const isApproved = t.isApproved === true || String(t.isApproved).toUpperCase() === 'TRUE';
        if (t.type === 'receive' && !isApproved) return;
        
        const item = findByKey(state.items, 'code', t.itemCode);
        if (!item) return;
        const processStockUpdate = (branchCode, qtyChange, cost) => {
            if (!branchCode || !stock.hasOwnProperty(branchCode)) return;
            const current = stock[branchCode][t.itemCode] || { quantity: 0, avgCost: parseFloat(item.cost) || 0, itemName: item.name };
            if(qtyChange > 0) {
                const totalValue = (current.quantity * current.avgCost) + (qtyChange * cost);
                const totalQty = current.quantity + qtyChange;
                const newAvgCost = totalQty > 0 ? totalValue / totalQty : current.avgCost;
                stock[branchCode][t.itemCode] = { itemCode: t.itemCode, quantity: totalQty, avgCost: newAvgCost, itemName: item.name };
                if (!tempAvgCosts[branchCode]) tempAvgCosts[branchCode] = {};
                tempAvgCosts[branchCode][t.itemCode] = newAvgCost;
            } else {
                current.quantity += qtyChange;
                stock[branchCode][t.itemCode] = current;
            }
        };
        const qty = parseFloat(t.quantity) || 0;
        switch (t.type) {
            case 'receive': processStockUpdate(t.branchCode, qty, parseFloat(t.cost) || 0); break;
            case 'transfer_out': processStockUpdate(t.fromBranchCode, -qty); break;
            case 'issue': processStockUpdate(t.fromBranchCode, -qty); break;
            case 'return_out': processStockUpdate(t.fromBranchCode, -qty); break;
            case 'adjustment_out': processStockUpdate(t.fromBranchCode, -qty); break;
            case 'transfer_in':
                const fromAvgCost = tempAvgCosts[t.fromBranchCode]?.[t.itemCode] || findByKey(state.items, 'code', t.itemCode)?.cost || 0;
                processStockUpdate(t.toBranchCode, qty, parseFloat(fromAvgCost));
                break;
            case 'adjustment_in':
                processStockUpdate(t.fromBranchCode, qty, parseFloat(t.cost) || 0);
                break;
        }
    });
    return stock;
};

const calculateSupplierFinancials = () => {
    const financials = {};
    (state.suppliers || []).forEach(s => { financials[s.supplierCode] = { supplierCode: s.supplierCode, supplierName: s.name, totalBilled: 0, totalPaid: 0, totalCredited: 0, balance: 0, invoices: {}, events: [] }; });
    (state.transactions || []).forEach(t => {
        const isApproved = t.isApproved === true || String(t.isApproved).toUpperCase() === 'TRUE';
        if (!t.supplierCode || !financials[t.supplierCode] || t.cost === undefined) return;
        const value = (parseFloat(t.quantity) || 0) * (parseFloat(t.cost) || 0);
        if (t.type === 'receive' && isApproved) {
            financials[t.supplierCode].totalBilled += value;
            const invNum = t.invoiceNumber;
            if (!financials[t.supplierCode].invoices[invNum]) { financials[t.supplierCode].invoices[invNum] = { number: invNum, date: t.date, total: 0, paid: 0 }; }
            financials[t.supplierCode].invoices[invNum].total += value;
        } else if (t.type === 'return_out') {
            financials[t.supplierCode].totalCredited += value;
        }
    });
    (state.payments || []).forEach(p => { 
        if (financials[p.supplierCode]) { 
            const amount = parseFloat(p.amount) || 0;
            if (p.method === 'OPENING BALANCE') {
                financials[p.supplierCode].totalBilled += amount;
            } else {
                financials[p.supplierCode].totalPaid += amount;
            }
            
            if (p.invoiceNumber && financials[p.supplierCode].invoices[p.invoiceNumber]) { 
                financials[p.supplierCode].invoices[p.invoiceNumber].paid += amount;
            } else if (p.method === 'OPENING BALANCE') {
                financials[p.supplierCode].invoices[p.invoiceNumber] = { number: p.invoiceNumber, date: p.date, total: amount, paid: 0 };
            }
        } 
    });
    Object.values(financials).forEach(s => {
        s.balance = s.totalBilled - s.totalPaid - s.totalCredited;
        Object.values(s.invoices).forEach(inv => { inv.balance = inv.total - inv.paid; if (Math.abs(inv.balance) < 0.01) { inv.status = 'Paid'; } else if (inv.paid > 0) { inv.status = 'Partial'; } else { inv.status = 'Unpaid'; } });
        const allEvents = [
            ...Object.values(s.invoices).map(i => ({ date: i.date, type: 'Invoice/OB', ref: i.number, debit: i.total, credit: 0 })),
            ...(state.transactions || []).filter(t => t.type === 'return_out' && t.supplierCode === s.supplierCode).map(t => ({ date: t.date, type: 'Return (Credit)', ref: t.ref, debit: 0, credit: (parseFloat(t.quantity) || 0) * (parseFloat(t.cost) || 0) })),
            ...(state.payments || []).filter(p => p.supplierCode === s.supplierCode && p.method !== 'OPENING BALANCE').map(p => ({ date: p.date, type: 'Payment', ref: p.paymentId, debit: 0, credit: (parseFloat(p.amount) || 0) }))
        ];
        s.events = allEvents.sort((a,b) => new Date(a.date) - new Date(b.date));
    });
    financials.allInvoices = {}; Object.values(financials).forEach(s => { Object.assign(financials.allInvoices, s.invoices); }); return financials;
};

const calculateHistoricalCosts = () => {
    const costSnapshots = {}; 
    const stock = {}; 
    
    (state.branches || []).forEach(branch => { stock[branch.branchCode] = {}; });
    
    const sortedTransactions = [...(state.transactions || [])]
        .filter(t => t.type) 
        .sort((a, b) => new Date(a.date) - new Date(b.date));

    sortedTransactions.forEach(t => {
        const isApproved = t.isApproved === true || String(t.isApproved).toUpperCase() === 'TRUE';
        if (t.type === 'receive' && !isApproved) return;

        const item = findByKey(state.items, 'code', t.itemCode);
        if (!item) return;

        const qty = parseFloat(t.quantity) || 0;
        let branchCode, costForUpdate, costForSnapshot;

        switch (t.type) {
            case 'receive':
            case 'adjustment_in':
                branchCode = t.branchCode || t.fromBranchCode;
                costForUpdate = parseFloat(t.cost) || 0;
                costForSnapshot = costForUpdate;
                break;
            case 'transfer_in':
                branchCode = t.toBranchCode;
                costForUpdate = costSnapshots[`${t.batchId}-${t.itemCode}`] || (stock[t.fromBranchCode]?.[t.itemCode]?.avgCost) || item.cost;
                costForSnapshot = costForUpdate;
                break;
            case 'issue':
            case 'return_out':
            case 'transfer_out':
            case 'adjustment_out':
                branchCode = t.fromBranchCode;
                costForUpdate = null; 
                costForSnapshot = stock[branchCode]?.[t.itemCode]?.avgCost || parseFloat(item.cost) || 0;
                break;
            default:
                return;
        }
        
        if (!branchCode || !stock[branchCode]) return;
        
        costSnapshots[`${t.batchId}-${t.itemCode}`] = costForSnapshot;

        const currentStock = stock[branchCode][t.itemCode] || { quantity: 0, avgCost: parseFloat(item.cost) || 0 };

        if (t.type === 'receive' || t.type === 'transfer_in' || t.type === 'adjustment_in') {
            const totalValue = (currentStock.quantity * currentStock.avgCost) + (qty * costForUpdate);
            const totalQty = currentStock.quantity + qty;
            const newAvgCost = totalQty > 0 ? totalValue / totalQty : currentStock.avgCost;
            stock[branchCode][t.itemCode] = { quantity: totalQty, avgCost: newAvgCost };
        } else {
            stock[branchCode][t.itemCode] = { quantity: currentStock.quantity - qty, avgCost: currentStock.avgCost };
        }
    });

    return costSnapshots;
};