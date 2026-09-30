// assets/modules/buy-account.js

import { api } from '../utils/api.js';
import { createAccountCard } from '../components/account-card.js';
import { showPurchaseModal } from '../components/account-purchase-modal.js';
import { renderAccountFilters } from '../components/account-filters.js';

async function initBuyAccountPage() {
 const categoriesGrid = document.getElementById('categoriesGrid');
 const accountsGrid = document.getElementById('accountsGrid');
 const marketplaceFilters = document.getElementById('marketplaceFilters');
 
 let currentBalance = 0;
 let currentFilters = {}; // Store active filters locally
 
  // --- NEW: Load Announcements ---
 async function loadNewAccountAnnouncements() {
  const scrollContainer = document.getElementById('announcementScrollContainer');
  if (!scrollContainer) return;
  
  try {
   const res = await api.getAccounts();
   const accounts = res.data || [];
   const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
   const newAccounts = accounts.filter(acc => acc.createdAt && acc.createdAt > sevenDaysAgo);
   
   if (newAccounts.length > 0) {
    const platforms = [...new Set(newAccounts.map(a => a.platform))];
    const newAccountsBanner = `
                <div style="display: flex; align-items: center; gap: 10px; flex-shrink: 0; background: rgba(244, 179, 66, 0.15); padding: 6px 14px; border-radius: 20px; border: 1px solid var(--color-gold);">
                    <span style="color: var(--color-gold); font-weight: 700; font-size: 13px;">🚀 New Accounts Added!</span>
                    <span style="color: var(--text-secondary); font-size: 13px;">${platforms.join(', ')}</span>
                </div>
                <a href="#accountsGrid" class="btn btn--primary btn--sm" style="flex-shrink: 0; padding: 5px 15px; height: auto; line-height: 1.4; text-decoration: none;">
                    Buy Account
                </a>
            `;
    scrollContainer.innerHTML += newAccountsBanner;
   }
  } catch (err) {
   console.error('Failed to load new account announcements', err);
  }
 }
 
 // Call the announcement loader
 loadNewAccountAnnouncements();
 
 // 1. Fetch Wallet Balance
 try {
  const walletRes = await api.getWallet();
  currentBalance = walletRes.data.balance || 0;
  // Update navbar balance if function exists
  if (window.updateNavbarBalance) window.updateNavbarBalance(currentBalance);
 } catch (err) {
  console.error('Failed to fetch wallet balance', err);
 }
 
 // 2. Fetch Categories & Render Filters
 try {
  const categoriesRes = await api.getAccountCategories();
  const categories = categoriesRes.data || [];
  
  categoriesGrid.innerHTML = '';
  if (categories.length === 0) {
   categoriesGrid.innerHTML = '<p>No categories available at the moment.</p>';
  } else {
   categories.forEach(cat => {
    const catEl = document.createElement('div');
    catEl.className = 'category-card card';
    catEl.setAttribute('data-category-id', cat.categoryId);
    catEl.innerHTML = `
                    <div class="category-card__icon">📱</div>
                    <div class="category-card__name">${cat.name}</div>
                    <div class="category-card__count">${cat.availableCount} available</div>
                    <span class="stock-badge stock-badge--${cat.stockStatus.toLowerCase().replace(' ', '')}">${cat.stockStatus}</span>
                `;
    
    // Attach click event to filter by exact Category ID
    catEl.addEventListener('click', () => {
     // Remove active class from all cards
     document.querySelectorAll('.category-card').forEach(c => c.classList.remove('is-active'));
     // Add active class to clicked card
     catEl.classList.add('is-active');
     
     // Set filter to exact categoryId
     currentFilters = { categoryId: cat.categoryId };
     loadAccounts(currentFilters);
     
     // Scroll to accounts grid smoothly
     accountsGrid.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    
    categoriesGrid.appendChild(catEl);
   });
  }
  
  // Initialize the dynamic filter component
  renderAccountFilters(marketplaceFilters, categories, (filters) => {
   // When manual filters are applied, remove the active border from category cards
   document.querySelectorAll('.category-card').forEach(c => c.classList.remove('is-active'));
   currentFilters = filters;
   loadAccounts(currentFilters);
  });
  
 } catch (err) {
  categoriesGrid.innerHTML = `<p class="text-danger">Failed to load categories.</p>`;
 }
 
 // 3. Fetch Accounts
 async function loadAccounts(filters = {}) {
  accountsGrid.innerHTML = '<div class="account-skeleton card">Loading accounts...</div>';
  
  try {
   const accountsRes = await api.getAccounts(filters);
   const accounts = accountsRes.data || [];
   
   accountsGrid.innerHTML = '';
   if (accounts.length === 0) {
    accountsGrid.innerHTML = '<p>No accounts match your filters.</p>';
    return;
   }
   
   accounts.forEach(acc => {
    const card = createAccountCard(acc, (selectedAccount) => {
     // On Select: Open Purchase Modal
     showPurchaseModal(selectedAccount, currentBalance, async (accountId) => {
      try {
       const purchaseRes = await api.purchaseAccount(accountId);
       
       alert('Purchase Successful! Check your email/My Accounts for credentials.');
       
       // Deduct from local balance state and refresh UI
       currentBalance -= selectedAccount.price;
       if (window.updateNavbarBalance) window.updateNavbarBalance(currentBalance);
       
       // Refresh inventory list using the current active filters
       loadAccounts(currentFilters);
      } catch (err) {
       alert(`Purchase Failed: ${err.message}`);
      }
     });
    });
    accountsGrid.appendChild(card);
   });
  } catch (err) {
   accountsGrid.innerHTML = `<p class="text-danger">Failed to load accounts.</p>`;
  }
 }
 
 // Initial Load (no filters)
 await loadAccounts();
}

export default initBuyAccountPage;