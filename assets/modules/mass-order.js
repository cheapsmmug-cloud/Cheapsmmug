// ===============================================
// Mass Order Module
// ===============================================

import { api } from '../utils/api.js';
import { $ } from '../utils/helpers.js';
import { formatCurrency } from '../modules/currency.js';
import { showToast } from '../components/toast.js';

export default async function initMassOrder() {
 const textarea = $('.form-textarea');
 const totalDisplay = $('.charge-amount');
 const form = textarea?.closest('form');
 const submitBtn = form?.querySelector('button[type="submit"]');
 
 let servicePrices = {};
 
 try {
  const response = await api.getServices();
  const services = response.data || [];
  
  services.forEach(service => {
   servicePrices[service.id] = service.sellingPrice;
  });
 } catch (error) {
  console.error('Failed to load services for mass order calculation:', error);
  showToast('Could not load service prices. Mass order calculation may be incorrect.', 'warning');
 }
 
 const calculateTotal = () => {
  if (!textarea) return;
  const lines = textarea.value.split('\n').filter(line => line.trim() !== '');
  let total = 0;
  
  lines.forEach(line => {
   const parts = line.split('|');
   if (parts.length === 3) {
    const serviceId = parts[0].trim();
    const qty = parseInt(parts[2]);
    
    const price = servicePrices[serviceId];
    if (price && qty > 0) {
     total += (qty / 1000) * price; // Base calculation in USD
    }
   }
  });
  
  if (totalDisplay) totalDisplay.textContent = formatCurrency(total);
 };
 
 if (textarea) {
  textarea.addEventListener('input', calculateTotal);
 }
 
 // Re-calculate total instantly if currency changes
 window.addEventListener('currencyChanged', calculateTotal);
 
 if (form) {
  form.addEventListener('submit', async (e) => {
   e.preventDefault();
   const lines = textarea.value.split('\n').filter(line => line.trim() !== '');
   
   if (lines.length === 0) {
    showToast('Please enter at least one order line.', 'error');
    return;
   }
   
   if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = `Processing ${lines.length} orders...`;
   }
   
   showToast(`Submitting ${lines.length} orders...`, 'info');
   let successCount = 0;
   let failCount = 0;
   
   for (const line of lines) {
    const parts = line.split('|');
    if (parts.length === 3) {
     const serviceId = parts[0].trim();
     const link = parts[1].trim();
     const quantity = parseInt(parts[2]);
     
     try {
      await api.createOrder(serviceId, link, quantity);
      successCount++;
     } catch (error) {
      failCount++;
      console.error(`Failed to place order for service ${serviceId}:`, error.message);
     }
    } else {
     failCount++;
    }
   }
   
   if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Submit Mass Order';
   }
   
   // Refresh navbar balance
   const navBalance = document.querySelector('.navbar__balance .balance-amount');
   if (navBalance) {
    try {
     const meRes = await api.getMe();
     navBalance.textContent = formatCurrency(meRes.data.balance);
    } catch (e) {}
   }
   
   if (failCount === 0) {
    showToast(`Successfully submitted ${successCount} orders!`, 'success');
    form.reset();
    if (totalDisplay) totalDisplay.textContent = formatCurrency(0);
   } else {
    showToast(`Submission complete: ${successCount} succeeded, ${failCount} failed. Check if you have enough balance.`, 'warning');
   }
  });
 }
}