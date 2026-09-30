// ===============================================
// Refill Module (Rewritten & Upgraded)
// ===============================================

import { api } from '../utils/api.js';
import { $ } from '../utils/helpers.js';
import { showToast } from '../components/toast.js';
import { formatDate } from '../utils/formatter.js';

export default async function initRefill() {
 const form = $('.form-card form');
 if (!form) return;
 
 // SAFE DOM Targeting using specific IDs
 const orderIdInput = $('#refillOrderId');
 const linkInput = $('#refillLink');
 const submitBtn = form.querySelector('button[type="submit"]');
 
 // --- Auto-fill from Orders Table URL ---
 const urlParams = new URLSearchParams(window.location.search);
 if (urlParams.get('order') && orderIdInput) orderIdInput.value = urlParams.get('order');
 if (urlParams.get('link') && linkInput) linkInput.value = decodeURIComponent(urlParams.get('link'));
 // --------------------------------------
 
 // 1. Fetch and Render Refill History on page load
 await fetchRefillHistory();
 
 // 2. Handle Form Submission
 form.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const orderId = orderIdInput.value.trim();
  const link = linkInput.value.trim();
  
  // Validation
  if (!orderId || !link) {
   showToast('Please enter both your Order ID and Link', 'error');
   return;
  }
  
  // Basic Link validation
  if (!link.startsWith('http://') && !link.startsWith('https://')) {
   showToast('Please enter a valid link starting with http:// or https://', 'error');
   return;
  }
  
  // Loading state
  if (submitBtn) {
   submitBtn.disabled = true;
   submitBtn.textContent = 'Submitting...';
  }
  
  try {
   await api.requestRefill(orderId, link);
   showToast('Refill request submitted successfully!', 'success');
   form.reset();
   
   // Clear URL parameters after successful submission
   window.history.replaceState({}, document.title, window.location.pathname);
   
   // Refresh the history table
   await fetchRefillHistory();
  } catch (error) {
   showToast(error.message || 'Failed to submit refill request.', 'error');
  } finally {
   if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Submit Refill Request';
   }
  }
 });
}

// --- Fetch Past Refills ---
async function fetchRefillHistory() {
 const tbody = $('#refillHistoryBody');
 if (!tbody) {
  console.error("Missing #refillHistoryBody in HTML");
  return;
 }
 
 // Loading state
 tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">Loading refill history...</td></tr>`;
 
 try {
  const response = await api.getRefills();
  
  // Defensively extract array
  const refills = Array.isArray(response?.data) ? response.data : [];
  
  if (refills.length === 0) {
   tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">No refill requests yet.</td></tr>`;
   return;
  }
  
  tbody.innerHTML = refills.map(r => {
   // Determine badge color based on status
   let statusClass = 'badge--default';
   if (r.status === 'approved' || r.status === 'completed') statusClass = 'badge--success';
   if (r.status === 'rejected' || r.status === 'failed') statusClass = 'badge--danger';
   if (r.status === 'pending' || r.status === 'processing') statusClass = 'badge--primary';
   
   const shortLink = r.link?.length > 30 ? r.link.substring(0, 30) + '...' : r.link || '—';
   const formattedDate = r.createdAt ? formatDate(r.createdAt) : '—';
   
   return `
    <tr>
     <td>#${r.id?.substring(0, 8) || 'N/A'}</td>
     <td>${r.orderId || 'N/A'}</td>
     <td title="${r.link || ''}">${shortLink}</td>
     <td><span class="badge ${statusClass}">${r.status || '—'}</span></td>
     <td class="text-muted">${formattedDate}</td>
    </tr>
   `;
  }).join('');
  
 } catch (error) {
  console.error('Failed to load refill history:', error);
  tbody.innerHTML = `<tr><td colspan="5" class="text-center text-danger">Failed to load refill history.</td></tr>`;
 }
}