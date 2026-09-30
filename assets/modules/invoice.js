// ===============================================
// Invoice Module
// ===============================================

import { api } from '../utils/api.js';
import { $ } from '../utils/helpers.js';
import { formatCurrency } from '../modules/currency.js';
import { formatDate } from '../utils/formatter.js';

let currentInvoices = [];

export default async function initInvoice() {
    const grid = $('.invoice-grid');
    if (!grid) return;
    
    try {
        let payments = [];
        let accountPurchases = [];
        
        // 1. Fetch standard deposit payments safely FROM USER'S WALLET
        try {
            const walletRes = await api.getWallet();
            const userTransactions = walletRes.data?.transactions || [];
            
            // Filter for approved deposits/credits only
            payments = userTransactions
                .filter(tx => tx.type === 'credit' || tx.status === 'approved')
                .map(tx => ({
                    id: tx.id,
                    amount: tx.amount,
                    createdAt: tx.createdAt,
                    type: 'deposit',
                    displayAmount: tx.amount
                }));
        } catch (err) {
            console.error('Failed to load payment invoices:', err);
        }
        
        // 2. Fetch account purchases safely
        try {
            const accountRes = await api.getMyAccountPurchases();
            accountPurchases = (accountRes.data || []).map(p => ({
                ...p,
                type: 'account_purchase',
                createdAt: p.purchasedAt,
                displayAmount: p.amount
            }));
        } catch (err) {
            console.error('Failed to load account purchase invoices:', err);
        }
        
        // Combine and sort by date (newest first)
        currentInvoices = [...payments, ...accountPurchases].sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return dateB - dateA;
        });
        
        renderInvoices();
        
        // Listen for currency changes to re-render invoice amounts instantly
        window.addEventListener('currencyChanged', renderInvoices);
        
    } catch (error) {
        console.error('Failed to load invoices:', error);
        grid.innerHTML = `<div class="text-center text-danger" style="grid-column: 1 / -1; padding: 40px;">Failed to load invoices.</div>`;
    }
    
    function renderInvoices() {
        // Ensure credentials card is hidden when grid re-renders
        const credCard = $('#accountCredentialsCard');
        if (credCard) credCard.style.display = 'none';
        
        if (currentInvoices.length === 0) {
            grid.innerHTML = `<div class="text-center text-muted" style="grid-column: 1 / -1; padding: 40px;">No invoices found. Approved deposits and account purchases will appear here.</div>`;
            return;
        }
        
        grid.innerHTML = currentInvoices.map(inv => {
            if (inv.type === 'account_purchase') {
                // HTML for Account Purchase Invoice
                return `
                    <div class="card invoice-card">
                        <div class="invoice-card__header">
                            <span class="invoice-id">ACC-${inv.id.substring(0, 8)}</span>
                            <span class="badge badge--success">Account Purchase</span>
                        </div>
                        <h3 class="invoice-amount">${formatCurrency(inv.displayAmount)}</h3>
                        <p class="invoice-date">Issued: ${formatDate(inv.createdAt)}</p>
                        <div class="invoice-actions">
                            <button class="btn btn--outline btn--sm" onclick="window.print()">Print</button>
                            <button class="btn btn--primary btn--sm view-credentials" data-id="${inv.id}">View Credentials</button>
                        </div>
                    </div>
                `;
            }
            
            // HTML for Standard Deposit Invoice
            return `
                <div class="card invoice-card">
                    <div class="invoice-card__header">
                        <span class="invoice-id">#${inv.id.substring(0, 8)}</span>
                        <span class="badge badge--success">Paid</span>
                    </div>
                    <h3 class="invoice-amount">${formatCurrency(inv.displayAmount)}</h3>
                    <p class="invoice-date">Issued: ${formatDate(inv.createdAt)}</p>
                    <div class="invoice-actions">
                        <button class="btn btn--outline btn--sm" onclick="window.print()">Print</button>
                        <button class="btn btn--primary btn--sm">Download</button>
                    </div>
                </div>
            `;
        }).join('');
        
        // Attach event listeners to the "View Credentials" buttons
        document.querySelectorAll('.view-credentials').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                const purchaseId = e.target.getAttribute('data-id');
                await showAccountCredentials(purchaseId);
            });
        });
    }
    
    // Fetch and display secure account credentials
    async function showAccountCredentials(purchaseId) {
        const credCard = $('#accountCredentialsCard');
        const credBody = $('#credentialsTableBody');
        
        if (!credCard || !credBody) return;
        
        try {
            const res = await api.getMyAccountPurchase(purchaseId);
            const purchase = res.data;
            const acc = purchase.accountDetails || {};
            
            let rowsHtml = '';
            if (acc.username) rowsHtml += `<tr><td><strong>Account Username</strong></td><td>${acc.username}</td></tr>`;
            if (acc.accountPassword) rowsHtml += `<tr><td><strong>Account Password</strong></td><td>${acc.accountPassword}</td></tr>`;
            if (acc.email) rowsHtml += `<tr><td><strong>Recovery Email</strong></td><td>${acc.email}</td></tr>`;
            if (acc.emailPassword) rowsHtml += `<tr><td><strong>Email Password</strong></td><td>${acc.emailPassword}</td></tr>`;
            if (acc.recoveryEmail) rowsHtml += `<tr><td><strong>Backup Recovery Email</strong></td><td>${acc.recoveryEmail}</td></tr>`;
            if (acc.recoveryEmailPassword) rowsHtml += `<tr><td><strong>Recovery Email Password</strong></td><td>${acc.recoveryEmailPassword}</td></tr>`;
            if (acc.twoFactorSecret) rowsHtml += `<tr><td><strong>2FA Secret / Backup Codes</strong></td><td>${acc.twoFactorSecret}</td></tr>`;
            
            if (rowsHtml !== '') {
                credBody.innerHTML = rowsHtml;
                credCard.style.display = 'block';
                credCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else {
                alert('No credentials found for this purchase.');
            }
        } catch (err) {
            console.error('Failed to load credentials:', err);
            alert('Failed to fetch credentials. Please try again later.');
        }
    }
}