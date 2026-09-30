// ===============================================
// Wallet Module
// ===============================================

import { api } from '../utils/api.js';
import { $, generateUUID } from '../utils/helpers.js';
import { formatCurrency } from '../modules/currency.js';
import { formatDate } from '../utils/formatter.js';
import { showToast } from '../components/toast.js';

// FIX: Module-scoped state to prevent duplication
let currentBalance = 0;
let currentTransactions = [];
let pendingPollInterval = null;
let walletInitialized = false;
let userEmail = 'guest@smmmaria.com'; // Fallback
let currentIdempotencyKey = generateUUID(); // FIX: Generate key on module load

// Helper to format Ugandan phone numbers to 2567XXXXXXXX
function formatUgPhone(phone) {
  if (!phone) return '';
  phone = phone.replace(/\s+/g, '').replace(/^\+/, '');
  if (phone.startsWith('256')) return phone;
  if (phone.startsWith('0')) return '256' + phone.substring(1);
  return phone;
}

export default async function initWallet() {
  if (walletInitialized) {
    return refreshWallet();
  }
  walletInitialized = true;

  try {
    const meRes = await api.getMe();
    if (meRes.data && meRes.data.email) userEmail = meRes.data.email;
  } catch (e) {
    console.warn('Could not fetch user email for payment gateway.');
  }

  await refreshWallet();
  window.addEventListener('currencyChanged', updateWalletUI);
  setupDepositForm();
  checkPendingAndShowCancel();
}

async function refreshWallet() {
  const balanceEl = $('.balance-card__amount');
  const tbody = $('.transactions-card tbody');
  
  try {
    const response = await api.getWallet();
    const walletData = response.data;
    currentBalance = walletData.balance || 0;
    currentTransactions = walletData.transactions || [];
    updateWalletUI();
  } catch (error) {
    if (balanceEl) balanceEl.textContent = formatCurrency(0);
    if (tbody) tbody.innerHTML = `<tr><td colspan="5" class="text-center text-danger">Failed to load wallet data.</td></tr>`;
  }
}

function updateWalletUI() {
  const balanceEl = $('.balance-card__amount');
  const tbody = $('.transactions-card tbody');
  
  if (balanceEl) balanceEl.textContent = formatCurrency(currentBalance);
  
  if (tbody) {
    if (!currentTransactions || currentTransactions.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">No transactions yet. Click Add Funds to make your first deposit!</td></tr>`;
      return;
    }

    const sortedTx = [...currentTransactions].sort((a, b) => new Date(b.date) - new Date(a.date));
    const getCategory = (dateStr) => {
      const date = new Date(dateStr);
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      if (date >= today) return "Today";
      if (date >= yesterday) return "Yesterday";
      if (date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()) return "This Month";
      return "Older";
    };
   
    let html = '';
    let lastCategory = '';
    const isViewingAll = window.viewAllWalletTx || false;
    const displayTx = isViewingAll ? sortedTx : sortedTx.filter(tx => getCategory(tx.date) === "Today");
   
    if (displayTx.length === 0) {
      if (!isViewingAll) {
        html += `<tr style="background: var(--bg-body);"><td colspan="5" style="font-weight: 700; padding: 10px 15px; color: var(--text-secondary); text-transform: uppercase; font-size: 12px; letter-spacing: 0.5px;">Today</td></tr>`;
        html += `<tr><td colspan="5" class="text-center text-muted" style="padding: 15px;">No transactions done today.</td></tr>`;
      } else {
        html += `<tr><td colspan="5" class="text-center text-muted" style="padding: 15px;">No transactions found.</td></tr>`;
      }
    } else {
      displayTx.forEach(tx => {
        const category = getCategory(tx.date);
        if (isViewingAll || category === "Today") {
          if (category !== lastCategory) {
            html += `<tr style="background: var(--bg-body);"><td colspan="5" style="font-weight: 700; padding: 10px 15px; color: var(--text-secondary); text-transform: uppercase; font-size: 12px; letter-spacing: 0.5px;">${category}</td></tr>`;
            lastCategory = category;
          }
        }
        
        let badgeClass = 'badge--warning';
        if (tx.status === 'approved' || tx.status === 'completed') badgeClass = 'badge--success';
        else if (tx.status === 'rejected' || tx.status === 'cancelled') badgeClass = 'badge--danger';
        
        html += `
          <tr>
            <td>#${tx.id.substring(0, 8)}</td>
            <td>${tx.type}</td>
            <td class="${tx.type === 'deposit' || tx.type === 'refund' ? 'text-success' : 'text-danger'}">
              ${tx.type === 'deposit' || tx.type === 'refund' ? '+' : '-'}${formatCurrency(tx.amount)}
            </td>
            <td>${formatDate(tx.date)}</td>
            <td><span class="badge ${badgeClass}">${tx.status}</span></td>
          </tr>
        `;
      });
    }
   
    html += `<tr><td colspan="5" style="text-align: center; padding: 15px; border-top: 2px solid var(--border-color);">`;
    if (!isViewingAll) {
      html += `<button id="viewAllTxBtn" class="btn btn--outline btn--sm">View all transactions</button>`;
    } else {
      html += `<button id="hideTxBtn" class="btn btn--outline btn--sm">Hide old transactions</button>`;
    }
    html += `</td></tr>`;
   
    tbody.innerHTML = html;
   
    const viewBtn = document.getElementById('viewAllTxBtn');
    if (viewBtn) viewBtn.addEventListener('click', () => { window.viewAllWalletTx = true; updateWalletUI(); });
   
    const hideBtn = document.getElementById('hideTxBtn');
    if (hideBtn) hideBtn.addEventListener('click', () => { window.viewAllWalletTx = false; updateWalletUI(); });
  }
}

function setupDepositForm() {
  const depositForm = $('#deposit-form');
  if (!depositForm) return;

  const amountInput = $('#deposit-amount');
  const bonusInfo = $('#bonus-info');
  const manualWhatsappBtn = $('#manual-whatsapp-btn');
  const flatBonus = 0.05;
  
  // FIX: Regenerate idempotency key when form state changes
  const regenerateKey = () => {
    currentIdempotencyKey = generateUUID();
  };

  const updateManualWhatsappLink = () => {
    if (!manualWhatsappBtn || !amountInput) return;
    const amount = parseFloat(amountInput.value) || 0;
    const message = `Hello Admin, I want to deposit ${formatCurrency(amount)} to my SMMMARIA wallet. Here is my payment receipt.`;
    const encodedMessage = encodeURIComponent(message);
    manualWhatsappBtn.href = `https://wa.me/256770898186?text=${encodedMessage}`;
  };
  
  const updateBonusInfo = () => {
    if (!amountInput || !bonusInfo) return;
    const amount = parseFloat(amountInput.value) || 0;
    const total = amount + flatBonus;
    bonusInfo.innerHTML = `Bonus: ${formatCurrency(flatBonus)} <span class="bonus-amount">Total Credited: ${formatCurrency(total)}</span>`;
    updateManualWhatsappLink();
  };
  
  if (amountInput && bonusInfo) {
    amountInput.addEventListener('input', () => {
      updateBonusInfo();
      regenerateKey(); // New amount = new logical deposit attempt
    });
  }
  
  const paymentRadios = depositForm.querySelectorAll('input[name="payment-method"]');
  const dynamicFields = depositForm.querySelectorAll('.dynamic-fields');
  const paymentTiles = depositForm.querySelectorAll('.payment-tile');
  
  paymentRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      const selectedMethod = e.target.value;
      dynamicFields.forEach(field => field.style.display = 'none');
      const targetField = document.getElementById(`${selectedMethod}-fields`);
      if (targetField) targetField.style.display = 'block';
      paymentTiles.forEach(tile => {
        const input = tile.querySelector('input');
        tile.classList.toggle('active', input.checked);
      });
      if (selectedMethod === 'manual') updateManualWhatsappLink();
      regenerateKey(); // New method = new logical deposit attempt
    });
  });
  
  depositForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = depositForm.querySelector('button[type="submit"]');
    if (!submitBtn || submitBtn.disabled) return;
    
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = 'Processing...';
    
    const amount = parseFloat(amountInput.value);
    const selectedMethodInput = depositForm.querySelector('input[name="payment-method"]:checked');
    
    if (!selectedMethodInput) {
      showToast('Please select a payment method', 'error');
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnText;
      return;
    }
    if (!amount || amount <= 0) {
      showToast('Please enter a valid amount', 'error');
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnText;
      return;
    }
    
    const method = selectedMethodInput.value;
    
    if (method === 'card') {
      handleCardPayment(amount, currentIdempotencyKey, submitBtn, originalBtnText);
      return;
    }
    
    showToast('Processing deposit request...', 'info');
    
    let payload = {
      amount,
      method,
      email: userEmail,
      idempotencyKey: currentIdempotencyKey // FIX: Use the module-scoped key
    };
    
    if (method === 'mtn' || method === 'airtel') {
      payload.phoneNumber = formatUgPhone($(`#${method}-phone`)?.value);
      if (!payload.phoneNumber || payload.phoneNumber.length < 12) {
        showToast(`Enter a valid ${method.toUpperCase()} number (e.g., 07XXXXXXXX)`, 'error');
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
        return;
      }
    } else if (method === 'manual') {
      const fileInput = $('#manual-receipt');
      if (fileInput && fileInput.files.length > 0) {
        payload.receipt = fileInput.files[0].name;
      }
    }
    
    try {
      await api.createDeposit(payload);
      if (method === 'mtn' || method === 'airtel') {
        showToast('Request sent! A prompt will appear on your phone. Please enter your PIN to approve the deposit.', 'info');
      } else if (method === 'manual') {
        showToast('Deposit request created! Please click the WhatsApp button to send your receipt.', 'info');
      } else {
        showToast('Deposit request submitted successfully!', 'success');
      }
      
      depositForm.reset();
      dynamicFields.forEach(field => field.style.display = 'none');
      paymentTiles.forEach(tile => tile.classList.remove('active'));
      if (bonusInfo) {
        bonusInfo.innerHTML = `Bonus: ${formatCurrency(0)} <span class="bonus-amount">Total Credited: ${formatCurrency(0)}</span>`;
      }
      
      regenerateKey(); // FIX: Generate a new key for the NEXT deposit
      await refreshWallet();
      checkPendingAndShowCancel(); 
    } catch (error) {
      showToast(error.message || 'Failed to submit deposit. Please try again.', 'error');
      // FIX: Do NOT regenerate key on failure. User can retry with the SAME key safely.
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnText;
    }
  });
}

async function handleCardPayment(amount, idempotencyKey, submitBtn, originalBtnText) {
  submitBtn.disabled = false;
  submitBtn.innerHTML = originalBtnText;
  
  const sheet = document.getElementById('cardPaymentSheet');
  const sheetAmount = document.getElementById('cardSheetAmount');
  const confirmBtn = document.getElementById('confirmCardPayBtn');
  const cancelBtn = document.getElementById('cancelCardPayBtn');
  
  if (!sheet || !confirmBtn) return;
  
  sheetAmount.textContent = formatCurrency(amount);
  sheet.style.display = 'flex';
  requestAnimationFrame(() => sheet.classList.add('active'));
  
  const closeSheet = () => {
    sheet.classList.remove('active');
    setTimeout(() => sheet.style.display = 'none', 200);
    confirmBtn.disabled = false;
    confirmBtn.innerText = 'Continue to Secure Checkout';
  };
  
  cancelBtn.onclick = closeSheet;
  sheet.onclick = (e) => { if (e.target === sheet) closeSheet(); };
  
  confirmBtn.onclick = async () => {
    if (confirmBtn.disabled) return;
    confirmBtn.disabled = true;
    confirmBtn.innerText = 'Redirecting to secure checkout...';
    
    try {
      const res = await api.createDeposit({ amount, method: 'card', email: userEmail, idempotencyKey });
      if (res?.data?.redirect_url) {
        window.location.href = res.data.redirect_url;
        return; 
      }
      throw new Error('Redirect URL not received from server.');
    } catch (error) {
      showToast(error.message || 'Failed to initiate card payment.', 'error');
      confirmBtn.disabled = false;
      confirmBtn.innerText = 'Continue to Secure Checkout';
    }
  };
}

async function checkPendingAndShowCancel() {
  const depositForm = $('#deposit-form');
  if (!depositForm) return;
  
  const submitBtn = depositForm.querySelector('button[type="submit"]');
  
  try {
    const res = await api.getPayments();
    const userPayments = res.data || [];
    const hasPending = userPayments.some(p => p.status === 'pending' && (p.method === 'mtn' || p.method === 'airtel'));
    
    if (hasPending) {
      // FIX: Disable the Process Deposit button until the current one expires/settles
      if (submitBtn) submitBtn.disabled = true;
      
      if (!pendingPollInterval) {
        pendingPollInterval = setInterval(async () => {
          try {
            const pollRes = await api.getPayments();
            const stillPending = (pollRes.data || []).some(p => p.status === 'pending' && (p.method === 'mtn' || p.method === 'airtel'));
            if (!stillPending) {
              clearInterval(pendingPollInterval);
              pendingPollInterval = null;
              
              showToast('Deposit processed! Your wallet has been updated.', 'success');
              await refreshWallet();
              
              // Re-enable the submit button
              if (submitBtn) submitBtn.disabled = false;
            }
          } catch (e) {
            console.error('Polling error:', e);
          }
        }, 10000); 
      }
    } else {
      // FIX: Re-enable the submit button if no pending deposits exist
      if (submitBtn) submitBtn.disabled = false;
      if (pendingPollInterval) {
        clearInterval(pendingPollInterval);
        pendingPollInterval = null;
      }
    }
  } catch (e) {
    console.error('Failed to check pending deposits');
  }
}