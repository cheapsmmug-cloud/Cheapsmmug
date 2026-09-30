// ===============================================
// Affiliate Module (100% Self-Contained)
// ===============================================

import { api } from '../utils/api.js';

export default async function initAffiliate() {
 const refInput = document.getElementById('refLink');
 const copyBtn = document.getElementById('copyRefBtn');
 const statsCard = document.querySelector('.affiliate-stats-card');
 
 // If we are not on the affiliate page, do nothing
 if (!refInput) return;
 
 // 1. Render UI Immediately (Non-blocking)
 refInput.value = 'Generating link...';
 
 // 2. Fetch data in the background
 try {
  const response = await api.getMe();
  const user = response.data || response || {};
  
  // Generate Referral Link
  const refCode = user.referralCode || user.accountId || user.id;
  
  if (refCode) {
   const baseUrl = window.location.origin;
   const finalLink = `${baseUrl}/register.html?ref=${refCode}`;
   
   refInput.value = finalLink;
   
   const shareLinkInput = document.getElementById('shareLink');
   if (shareLinkInput) shareLinkInput.value = finalLink;
  } else {
   refInput.value = 'Error: Could not generate link.';
  }
  
  // Update Affiliate Stats
  const statValues = document.querySelectorAll('.affiliate-stats-card .stat-card__value');
  const totalCommission = user.referralCommission || 0;
  
  if (statValues.length >= 3) {
   statValues[0].textContent = user.referralClicks || 0;
   statValues[1].textContent = user.referralSignups || 0;
   statValues[2].textContent = `$${parseFloat(totalCommission).toFixed(2)}`;
  }
  
  // Inject "Added to wallet" message
  if (statsCard && !document.getElementById('wallet-credit-info')) {
   const walletMsg = document.createElement('div');
   walletMsg.id = 'wallet-credit-info';
   walletMsg.style.cssText = 'margin-top: 15px; padding: 12px; background: rgba(37, 211, 102, 0.1); border: 1px solid rgba(37, 211, 102, 0.3); border-radius: 8px; font-size: 13px; color: var(--text-secondary); text-align: center;';
   walletMsg.innerHTML = `<strong style="color: var(--text-primary);">Total Earnings: $${parseFloat(totalCommission).toFixed(2)}</strong><br>Your affiliate commission is automatically added to your main wallet balance and is available for use immediately.`;
   statsCard.appendChild(walletMsg);
  }
  
 } catch (error) {
  console.error('Failed to load affiliate data:', error);
  refInput.value = 'Error loading link. Please refresh.';
 }
 
 // 3. Handle Copy Buttons Natively
 const handleCopy = (btn, input) => {
  if (!btn || !input) return;
  btn.addEventListener('click', () => {
   const linkToCopy = input.value;
   if (!linkToCopy || linkToCopy.startsWith('Error') || linkToCopy.startsWith('Generating')) return;
   
   if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(linkToCopy).then(() => {
     const originalText = btn.innerHTML;
     btn.innerHTML = 'Copied!';
     setTimeout(() => { btn.innerHTML = originalText; }, 2000);
    }).catch(() => {
     fallbackCopy(input, btn);
    });
   } else {
    fallbackCopy(input, btn);
   }
  });
 };
 
 const fallbackCopy = (input, btn) => {
  input.select();
  document.execCommand('copy');
  const originalText = btn.innerHTML;
  btn.innerHTML = 'Copied!';
  setTimeout(() => { btn.innerHTML = originalText; }, 2000);
 };
 
 handleCopy(copyBtn, refInput);
 handleCopy(document.getElementById('copyShareBtn'), document.getElementById('shareLink'));
}