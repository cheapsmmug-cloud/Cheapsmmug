// assets/modules/my-accounts.js

import { api } from '../utils/api.js';

async function initMyAccountsPage() {
 const tableBody = document.getElementById('myAccountsTableBody');
 const modal = document.getElementById('credentialModal');
 const modalBody = document.getElementById('credentialModalBody');
 const closeBtn = document.getElementById('closeCredentialModal');
 
 try {
  const res = await api.getMyAccountPurchases();
  const purchases = res.data || [];
  
  tableBody.innerHTML = '';
  if (purchases.length === 0) {
   tableBody.innerHTML = '<tr><td colspan="7" class="text-center">You have not purchased any accounts yet.</td></tr>';
   return;
  }
  
  purchases.forEach(p => {
   const row = document.createElement('tr');
   const date = new Date(p.purchasedAt).toLocaleDateString();
   row.innerHTML = `
                <td>${p.id.substring(0, 8)}...</td>
                <td>${p.platform}</td>
                <td>@${p.username}</td>
                <td>$${parseFloat(p.amount).toFixed(2)}</td>
                <td>${date}</td>
                <td><span class="status-badge status-badge--in">${p.status}</span></td>
                <td>
                    <button class="btn btn--primary btn--sm view-details-btn" data-id="${p.id}">View Details</button>
                </td>
            `;
   
   tableBody.appendChild(row);
  });
  
  // Attach event listeners to the View Details buttons
  document.querySelectorAll('.view-details-btn').forEach(btn => {
   btn.addEventListener('click', async (e) => {
    e.preventDefault();
    const purchaseId = e.target.getAttribute('data-id');
    await showAccountCredentials(purchaseId);
   });
  });
  
 } catch (err) {
  tableBody.innerHTML = `<tr><td colspan="7" class="text-center text-danger">Failed to load purchases.</td></tr>`;
 }
 
 async function showAccountCredentials(purchaseId) {
  try {
   const detailsRes = await api.getMyAccountPurchase(purchaseId);
   const details = detailsRes.data;
   const acc = details.accountDetails || {};
   
   modalBody.innerHTML = `
                <div class="purchase-info">
                    <div class="purchase-info__row"><span>Platform:</span> <strong>${details.platform}</strong></div>
                    <div class="purchase-info__row"><span>Username:</span> <strong>${details.username}</strong></div>
                </div>
                <h4 style="margin: 16px 0 8px; font-size: 14px;">Secure Credentials</h4>
                <div class="purchase-info" style="background: var(--bg-secondary);">
                    ${acc.accountPassword ? `<div class="purchase-info__row"><span>Password:</span> <strong>${acc.accountPassword}</strong></div>` : ''}
                    ${acc.email ? `<div class="purchase-info__row"><span>Email:</span> <strong>${acc.email}</strong></div>` : ''}
                    ${acc.emailPassword ? `<div class="purchase-info__row"><span>Email Pass:</span> <strong>${acc.emailPassword}</strong></div>` : ''}
                    ${acc.recoveryEmail ? `<div class="purchase-info__row"><span>Recovery Email:</span> <strong>${acc.recoveryEmail}</strong></div>` : ''}
                </div>
                <p style="font-size: 12px; color: var(--text-secondary); margin-top: 8px;">
                    ⚠️ Save these credentials securely. They will not be shown again if you lose them.
                </p>
            `;
   
   // Use the architecture's active class to show the modal
   modal.classList.add('active');
  } catch (err) {
   console.error('Failed to fetch credentials:', err);
   alert('Failed to fetch credentials. Please try again later.');
  }
 }
 
 // Close modal handler
 if (closeBtn) {
  closeBtn.addEventListener('click', () => modal.classList.remove('active'));
 }
}

export default initMyAccountsPage;