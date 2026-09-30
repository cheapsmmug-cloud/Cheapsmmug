// ===============================================
// New Order Module
// ===============================================

import { api } from '../utils/api.js';
import { $ } from '../utils/helpers.js';
import { formatCurrency } from '../modules/currency.js';
import { showToast } from '../components/toast.js';

export default async function initNewOrder() {
 const categorySelect = $('#category-select');
 const serviceSelect = $('#service-select');
 const qtyInput = $('#quantity');
 const linkInput = $('#link-input');
 const chargeDisplay = $('#charge-amount');
 const ugxChargeDisplay = $('#charge-amount-ugx');
 const infoBox = $('.info-box');
 
 let allServices = [];
 
 // 1. Fetch Real Services
 try {
  const response = await api.getServices();
  allServices = response.data || [];
  
  if (allServices.length === 0) {
   showToast('No services are available right now.', 'error');
   return;
  }
 } catch (error) {
  showToast('Failed to load services. Please refresh.', 'error');
  return;
 }
 
 // Reusable function to populate services based on category
 function populateServices(category = '') {
  const filteredServices = category ?
   allServices.filter(s => (s.category || 'Uncategorized') === category) :
   allServices;
  
  if (serviceSelect) {
   serviceSelect.innerHTML = '<option value="">Select Service</option>' +
    filteredServices.map(s => `<option value="${s.id}" data-price="${s.sellingPrice}">${s.name} (${formatCurrency(s.sellingPrice)}/1000)</option>`).join('');
  }
 }
 
 // 2. Populate Categories
 if (categorySelect) {
  const categories = [...new Set(allServices.map(s => s.category || 'Uncategorized'))];
  categorySelect.innerHTML = '<option value="">Select Category</option>' +
   categories.map(c => `<option value="${c}">${c}</option>`).join('');
  
  categorySelect.addEventListener('change', () => {
   populateServices(categorySelect.value);
   updateInfoBox(null);
   calculateCharge();
  });
 }
 
 // Render services immediately on page load
 populateServices('');
 
 // 3. Update Info Box on Service Change
 if (serviceSelect) {
  serviceSelect.addEventListener('change', () => {
   const selectedId = serviceSelect.value;
   const service = allServices.find(s => String(s.id) === String(selectedId));
   updateInfoBox(service);
   calculateCharge();
  });
 }
 
 function updateInfoBox(service) {
  const descCard = $('#service-description-card');
  
  if (!service) {
   const defaultHtml = `<p><strong>Description:</strong> Select a service to view details.</p>
                <div class="info-grid">
                    <span><strong>Service ID</strong> -</span>
                    <span><strong>Avg Time</strong> -</span>
                    <span><strong>Min</strong> -</span>
                    <span><strong>Max</strong> -</span>
                    <span><strong>Refill</strong> -</span>
                </div>`;
   
   if (infoBox) infoBox.innerHTML = defaultHtml;
   if (descCard) descCard.innerHTML = `<p>Select a service to view detailed description.</p>`;
   return;
  }
  
  const detailedHtml = `<p><strong>Description:</strong> ${service.name}</p>
            <div class="info-grid">
                <span><strong>Service ID</strong> ${service.supplierServiceId || 'N/A'}</span>
                <span><strong>Avg Time</strong> ${service.averageTime || 'Unknown'}</span>
                <span><strong>Min</strong> ${service.min}</span>
                <span><strong>Max</strong> ${service.max}</span>
                <span><strong>Refill</strong> ${service.refill ? 'Yes' : 'No'}</span>
            </div>`;
  
  if (infoBox) infoBox.innerHTML = detailedHtml;
  if (descCard) descCard.innerHTML = detailedHtml;
 }
 
 // 4. Live Calculation using dynamic currency.js
 const calculateCharge = () => {
  const selectedOption = serviceSelect?.options[serviceSelect.selectedIndex];
  const price = selectedOption ? parseFloat(selectedOption.getAttribute('data-price')) : 0;
  const qty = parseInt(qtyInput?.value) || 0;
  const totalUSD = (qty / 1000) * price;
  
  if (chargeDisplay) chargeDisplay.textContent = formatCurrency(totalUSD);
  if (ugxChargeDisplay) ugxChargeDisplay.style.display = 'none';
 };
 
 if (qtyInput) qtyInput.addEventListener('input', calculateCharge);
 
 // Listen for global currency changes to update prices instantly
 window.addEventListener('currencyChanged', () => {
  populateServices(categorySelect?.value || '');
  calculateCharge();
 });
 
 // 5. Form Submit (Place Real Order + Trigger Receipt)
 const form = $('.form-grid') || $('form');
 if (form) {
  form.addEventListener('submit', async (e) => {
   e.preventDefault();
   
   const serviceId = serviceSelect.value;
   const link = linkInput ? linkInput.value.trim() : '';
   const quantity = parseInt(qtyInput.value);
   
   if (!serviceId || !link || !quantity) {
    showToast('Please fill in all fields', 'error');
    return;
   }
   
   const service = allServices.find(s => String(s.id) === String(serviceId));
   if (quantity < service.min || quantity > service.max) {
    showToast(`Quantity must be between ${service.min} and ${service.max}`, 'error');
    return;
   }
   
   try {
    showToast('Placing order...', 'info');
    const res = await api.createOrder(serviceId, link, quantity);
    showToast('Order placed successfully!', 'success');
    
    // Fetch updated balance
    let newBalance = 0;
    try {
     const meRes = await api.getMe();
     newBalance = meRes.data.balance;
     const navBalance = document.querySelector('.navbar__balance .balance-amount');
     if (navBalance) navBalance.textContent = formatCurrency(newBalance);
    } catch (e) {}
    
    // Calculate charge for receipt
    const totalCharge = (quantity / 1000) * parseFloat(service.sellingPrice);
    
    // Trigger Inline Receipt
    showReceipt({
     orderId: res.data.orderId || res.data.id || 'N/A',
     serviceName: service.name,
     link: link,
     quantity: quantity,
     charge: totalCharge,
     balance: newBalance
    });
    
    form.reset();
    updateInfoBox(null);
    calculateCharge();
    
   } catch (error) {
    showToast(error.message || 'Failed to place order. Check your balance.', 'error');
   }
  });
 }
 
 // ==========================================
 // 6. PRE-SELECT SERVICE FROM URL
 // ==========================================
 const urlParams = new URLSearchParams(window.location.search);
 const preselectServiceId = urlParams.get('service') || urlParams.get('id');
 
 if (preselectServiceId) {
  const service = allServices.find(s => String(s.id) === String(preselectServiceId));
  
  if (service && categorySelect && serviceSelect) {
   categorySelect.value = service.category || 'Uncategorized';
   populateServices(categorySelect.value);
   serviceSelect.value = service.id;
   updateInfoBox(service);
   calculateCharge();
  } else {
   showToast('The requested service could not be found.', 'warning');
  }
 }
 
 // ==========================================
 // RECEIPT INLINE LOGIC
 // ==========================================
 function showReceipt(orderData) {
  const receiptContainer = document.getElementById('receiptContainer');
  const receiptContent = document.getElementById('receiptContent');
  const copyBtn = document.getElementById('copyReceiptBtn');
  
  if (!receiptContainer) return; // Safety check
  
  const plainTextReceipt = `
SMMMARIA PANEL - ORDER RECEIPT
=================================
Order ID: ${orderData.orderId}
Service: ${orderData.serviceName}
Link: ${orderData.link}
Quantity: ${orderData.quantity}
Charge: $${orderData.charge.toFixed(2)}
New Balance: $${orderData.balance.toFixed(2)}
Website: https://smmaria.site
=================================
Thank you for choosing SMMMARIA!`.trim();
  
  receiptContent.innerHTML = `
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;"><strong>Order ID:</strong> <span>${orderData.orderId}</span></div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;"><strong>Service:</strong> <span style="text-align: right;">${orderData.serviceName}</span></div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px; word-break: break-all;"><strong>Link:</strong> <span style="color: var(--color-gold); text-align: right;">${orderData.link}</span></div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;"><strong>Quantity:</strong> <span>${orderData.quantity}</span></div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;"><strong>Charge:</strong> <span style="font-weight: 700; color: var(--text-primary);">$${orderData.charge.toFixed(2)}</span></div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 12px;"><strong>New Balance:</strong> <span>$${orderData.balance.toFixed(2)}</span></div>
            <div style="border-top: 1px dashed var(--border-color); padding-top: 12px; text-align: center;">
                <span style="font-size: 12px; color: var(--text-muted);">https://smmaria.site</span>
            </div>
        `;
  
  // Show the inline container
  receiptContainer.style.display = 'block';
  
  // Scroll the receipt into view smoothly so the user sees it immediately
  receiptContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
  
  // Copy to clipboard functionality
  copyBtn.onclick = () => {
   navigator.clipboard.writeText(plainTextReceipt).then(() => {
    const originalText = copyBtn.innerHTML;
    copyBtn.innerText = 'Receipt Copied!';
    setTimeout(() => {
     copyBtn.innerHTML = originalText;
    }, 2000);
   }).catch(err => {
    alert('Failed to copy receipt.');
   });
  };
 }
}