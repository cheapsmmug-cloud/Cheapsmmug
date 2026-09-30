// ===============================================
// Buy Child Panel Module
// ===============================================

import { api } from '../utils/api.js';
import { showToast } from '../components/toast.js';
import { formatCurrency } from '../modules/currency.js';

let userBalance = 0;
let selectedPlan = null;
let selectedPrice = 0;

export default async function initBuyChildPanel() {
 const formCard = document.getElementById('setup-form-card');
 const planNameSpan = document.getElementById('selected-plan-name');
 const displayPrice = document.getElementById('display-price');
 const displayBalance = document.getElementById('display-balance');
 const subdomainInput = document.getElementById('subdomain');
 const subdomainPreview = document.getElementById('subdomain-preview');
 const form = document.getElementById('create-panel-form');
 const selectButtons = document.querySelectorAll('.select-plan-btn');
 
 if (!formCard) return;
 
 // 1. Fetch User Wallet Balance
 try {
  const response = await api.getMe();
  userBalance = response.data?.balance || 0;
 } catch (error) {
  console.error('Failed to fetch user balance:', error);
  showToast('Could not fetch wallet balance', 'error');
 }
 
 // Helper to update dynamic currency displays
 const updateBuyPanelUI = () => {
  if (displayBalance) {
   displayBalance.textContent = formatCurrency(userBalance);
  }
  if (selectedPlan && displayPrice) {
   displayPrice.textContent = formatCurrency(selectedPrice);
  }
 };
 
 // Initial UI Render
 updateBuyPanelUI();
 
 // Listen for currency changes to update prices instantly
 window.addEventListener('currencyChanged', updateBuyPanelUI);
 
 // 2. Handle Plan Selection
 selectButtons.forEach(btn => {
  btn.addEventListener('click', () => {
   selectedPlan = btn.dataset.plan;
   selectedPrice = parseFloat(btn.dataset.price);
   
   // Update Form UI
   formCard.style.display = 'block';
   if (planNameSpan) planNameSpan.textContent = selectedPlan;
   
   updateBuyPanelUI(); // Update price using formatCurrency
   
   // Smooth scroll to form
   formCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
   
   // Store selected plan in the form dataset for submission
   form.dataset.selectedPlan = selectedPlan;
   form.dataset.selectedPrice = selectedPrice;
  });
 });
 
 // 3. Live Subdomain Preview
 if (subdomainInput && subdomainPreview) {
  subdomainInput.addEventListener('input', (e) => {
   // Sanitize input to lowercase and remove spaces/special chars
   let value = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
   e.target.value = value;
   subdomainPreview.textContent = `${value || 'yourname'}.smmaria.site`;
  });
 }
 
 // 4. Handle Form Submission (Purchase)
 if (form) {
  form.addEventListener('submit', async (e) => {
   e.preventDefault();
   
   const plan = form.dataset.selectedPlan;
   const price = parseFloat(form.dataset.selectedPrice); // Base USD price
   const panelName = document.getElementById('panelName').value.trim();
   const adminUsername = document.getElementById('adminUsername').value.trim();
   const adminPassword = document.getElementById('adminPassword').value;
   const subdomain = subdomainInput.value.trim();
   
   if (!plan || !price || !panelName || !adminUsername || !adminPassword || !subdomain) {
    return showToast('Please fill in all fields', 'error');
   }
   
   // Check if user has enough funds
   if (userBalance < price) {
    return showToast(`Insufficient balance. You need ${formatCurrency(price)} but only have ${formatCurrency(userBalance)}. Please top up your wallet.`, 'error');
   }
   
   // Disable submit button to prevent double clicking
   const submitBtn = form.querySelector('button[type="submit"]');
   const originalText = submitBtn.innerHTML;
   submitBtn.disabled = true;
   submitBtn.innerHTML = 'Processing Payment...';
   
   try {
    // Send the new admin credentials to the backend
    const response = await api.purchaseChildPanel({
     plan,
     price, // Backend receives base USD price
     panelName,
     subdomain,
     adminUsername,
     adminPassword
    });
    
    showToast('Payment successful! Your Child Panel is being provisioned...', 'success');
    
    // Redirect to the reseller login page
    setTimeout(() => {
     window.location.href = `resellers/login.html?success=true&panel=${subdomain}`;
    }, 2000);
    
   } catch (error) {
    console.error('Panel purchase failed:', error);
    showToast(error.message || 'Failed to purchase panel. Please try again.', 'error');
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalText;
   }
  });
 }
}