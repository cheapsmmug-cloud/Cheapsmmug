// assets/components/account-purchase-modal.js

export function showPurchaseModal(account, currentBalance, onConfirm) {
    const modal = document.getElementById('purchaseModal');
    const modalBody = document.getElementById('purchaseModalBody');
    const confirmBtn = document.getElementById('confirmPurchaseBtn');
    const cancelBtn = document.getElementById('cancelPurchaseBtn');
    const closeBtn = document.getElementById('closePurchaseModal');
    
    const price = parseFloat(account.price);
    const remainingBalance = (parseFloat(currentBalance) - price).toFixed(2);
    
    modalBody.innerHTML = `
        <div class="purchase-info">
            <div class="purchase-info__row">
                <span>Platform:</span>
                <strong>${account.platform}</strong>
            </div>
            <div class="purchase-info__row">
                <span>Account:</span>
                <strong>@${account.username}</strong>
            </div>
            <div class="purchase-info__row">
                <span>Price:</span>
                <strong>$${price.toFixed(2)}</strong>
            </div>
            <div class="purchase-info__row">
                <span>Current Balance:</span>
                <strong>$${parseFloat(currentBalance).toFixed(2)}</strong>
            </div>
            <div class="purchase-info__row purchase-info__row--highlight">
                <span>Balance After Purchase:</span>
                <strong>$${remainingBalance}</strong>
            </div>
        </div>
        <p style="font-size: 13px; color: var(--text-secondary); text-align: center;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle; margin-right: 4px;"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
            Your wallet will be charged immediately upon confirmation.
        </p>
    `;
    
    // Use the architecture's active class
    modal.classList.add('active');
    
    // Cleanup previous listeners to avoid double-clicking bugs
    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
    
    newConfirmBtn.addEventListener('click', async () => {
        newConfirmBtn.disabled = true;
        newConfirmBtn.innerText = 'Processing...';
        await onConfirm(account.id);
        newConfirmBtn.disabled = false;
        newConfirmBtn.innerText = 'Buy Account';
        modal.classList.remove('active');
    });
    
    const closeModal = () => modal.classList.remove('active');
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
}