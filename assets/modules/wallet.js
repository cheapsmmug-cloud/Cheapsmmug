// ===============================================
// Wallet Module
// ===============================================

import { api } from "../utils/api.js";
import { $, generateUUID } from "../utils/helpers.js";
import { formatCurrency } from "../modules/currency.js";
import { formatDate } from "../utils/formatter.js";
import { showToast } from "../components/toast.js";

// FIX: Module-scoped state to prevent duplication
let currentBalance = 0;
let currentTransactions = [];
let pendingPollInterval = null;
let backgroundRefreshInterval = null;
let walletInitialized = false;
let depositSubmitting = false; // FIX: Submission guard
let activePaymentId = null; // FIX: Track the specific payment being polled
let userEmail = "guest@smmmaria.com"; // Fallback
let currentIdempotencyKey = generateUUID(); // FIX: Generate key on module load, retain for lifecycle
let pollAttempts = 0; // FIX: Polling attempts counter

// Helper to format Ugandan phone numbers to 2567XXXXXXXX
function formatUgPhone(phone) {
  if (!phone) return "";
  phone = phone.replace(/\s+/g, "").replace(/^\+/, "");
  if (phone.startsWith("256")) return phone;
  if (phone.startsWith("0")) return "256" + phone.substring(1);
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
    console.warn("Could not fetch user email for payment gateway.");
  }

  await refreshWallet();
  window.addEventListener("currencyChanged", updateWalletUI);

  setupDepositForm();
  checkPendingAndShowCancel();
  startBackgroundRefresh(); // FIX: Start background polling

  // FIX: Clean up intervals on page unload
  window.addEventListener("beforeunload", () => {
    if (pendingPollInterval) clearInterval(pendingPollInterval);
    if (backgroundRefreshInterval) clearInterval(backgroundRefreshInterval);
  });
}

// FIX: Background wallet refresh system
function startBackgroundRefresh() {
  if (backgroundRefreshInterval) clearInterval(backgroundRefreshInterval);

  backgroundRefreshInterval = setInterval(async () => {
    if (document.hidden) return; // Don't run if tab is hidden
    await refreshWallet();
    // Also check if any pending payments changed state while we weren't looking
    await checkPendingAndShowCancel();
  }, 15000); // 15 seconds

  // Handle visibility change to refresh immediately upon returning to the tab
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      refreshWallet();
      checkPendingAndShowCancel();
    }
  });
}

async function refreshWallet() {
  const balanceEl = $(".balance-card__amount");
  const tbody = $(".transactions-card tbody");

  try {
    const response = await api.getWallet();
    const walletData = response.data;
    currentBalance = walletData.balance || 0;
    currentTransactions = walletData.transactions || [];
    updateWalletUI();

    // Silent background reconciliation check for any pending deposit in history
    const pendingTx = currentTransactions.find(
      (t) =>
        (t.status === "pending" || t.status === "processing") &&
        (t.type === "deposit" || !t.type),
    );
    if (pendingTx && !window._reconcilingTxId) {
      window._reconcilingTxId = pendingTx.id;
      api
        .getPaymentStatus(pendingTx.id)
        .then((res) => {
          window._reconcilingTxId = null;
          const s = res?.data?.status;
          if (
            s &&
            (s === "completed" ||
              s === "approved" ||
              s === "rejected" ||
              s === "cancelled")
          ) {
            refreshWallet();
          }
        })
        .catch(() => {
          window._reconcilingTxId = null;
        });
    }
  } catch (error) {
    if (balanceEl) balanceEl.textContent = formatCurrency(0);
    if (tbody)
      tbody.innerHTML = `<tr><td colspan="5" class="text-center text-danger">Failed to load wallet data.</td></tr>`;
  }
}

function updateWalletUI() {
  const balanceEl = $(".balance-card__amount");
  const tbody = $(".transactions-card tbody");

  if (balanceEl) balanceEl.textContent = formatCurrency(currentBalance);

  if (tbody) {
    if (!currentTransactions || currentTransactions.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">No transactions yet. Click Add Funds to make your first deposit!</td></tr>`;
      return;
    }

    const sortedTx = [...currentTransactions].sort(
      (a, b) => new Date(b.date) - new Date(a.date),
    );
    const getCategory = (dateStr) => {
      const date = new Date(dateStr);
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      if (date >= today) return "Today";
      if (date >= yesterday) return "Yesterday";
      if (
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear()
      )
        return "This Month";
      return "Older";
    };

    let html = "";
    let lastCategory = "";
    const isViewingAll = window.viewAllWalletTx || false;
    const displayTx = isViewingAll
      ? sortedTx
      : sortedTx.filter((tx) => getCategory(tx.date) === "Today");

    if (displayTx.length === 0) {
      if (!isViewingAll) {
        html += `<tr style="background: var(--bg-body);"><td colspan="5" style="font-weight: 700; padding: 10px 15px; color: var(--text-secondary); text-transform: uppercase; font-size: 12px; letter-spacing: 0.5px;">Today</td></tr>`;
        html += `<tr><td colspan="5" class="text-center text-muted" style="padding: 15px;">No transactions done today.</td></tr>`;
      } else {
        html += `<tr><td colspan="5" class="text-center text-muted" style="padding: 15px;">No transactions found.</td></tr>`;
      }
    } else {
      displayTx.forEach((tx) => {
        const category = getCategory(tx.date);
        if (isViewingAll || category === "Today") {
          if (category !== lastCategory) {
            html += `<tr style="background: var(--bg-body);"><td colspan="5" style="font-weight: 700; padding: 10px 15px; color: var(--text-secondary); text-transform: uppercase; font-size: 12px; letter-spacing: 0.5px;">${category}</td></tr>`;
            lastCategory = category;
          }
        }

        let badgeHtml = "";
        if (tx.status === "approved" || tx.status === "completed") {
          badgeHtml = `<span class="badge badge--success">${tx.status}</span>`;
        } else if (
          tx.status === "rejected" ||
          tx.status === "cancelled" ||
          tx.status === "failed"
        ) {
          badgeHtml = `<span class="badge badge--danger">${tx.status}</span>`;
        } else {
          badgeHtml = `
            <button class="badge badge--warning btn-check-tx-status" data-tx-id="${tx.id}" style="cursor: pointer; border: 1px solid rgba(244, 179, 66, 0.4); background: rgba(244, 179, 66, 0.15); border-radius: 6px; padding: 3px 8px; font-weight: 600; display: inline-flex; align-items: center; gap: 4px; font-size: 11px; transition: all 0.2s;" title="Query live status from PesaJet">
              <span>${tx.status || "pending"}</span>
              <span>🔄</span>
            </button>
          `;
        }

        // Safe date formatting to prevent UI crashes
        const formattedDate = tx.date ? formatDate(tx.date) : "N/A";

        html += `
          <tr>
            <td>#${tx.id ? tx.id.substring(0, 8) : "N/A"}</td>
            <td>${tx.type || "N/A"}</td>
            <td class="${tx.type === "deposit" || tx.type === "refund" ? "text-success" : "text-danger"}">
              ${tx.type === "deposit" || tx.type === "refund" ? "+" : "-"}${formatCurrency(tx.amount || 0)}
            </td>
            <td>${formattedDate}</td>
            <td>${badgeHtml}</td>
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

    const viewBtn = document.getElementById("viewAllTxBtn");
    if (viewBtn)
      viewBtn.addEventListener("click", () => {
        window.viewAllWalletTx = true;
        updateWalletUI();
      });

    const hideBtn = document.getElementById("hideTxBtn");
    if (hideBtn)
      hideBtn.addEventListener("click", () => {
        window.viewAllWalletTx = false;
        updateWalletUI();
      });

    // Attach interactive status check listeners
    tbody.querySelectorAll(".btn-check-tx-status").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const txId = btn.getAttribute("data-tx-id");
        if (!txId || btn.disabled) return;

        btn.disabled = true;
        const originalContent = btn.innerHTML;
        btn.innerHTML = "<span>Checking...</span> <span>⏳</span>";

        try {
          const res = await api.getPaymentStatus(txId);
          const updated = res?.data;
          if (
            updated &&
            (updated.status === "completed" || updated.status === "approved")
          ) {
            showToast(
              `Payment #${txId.substring(0, 8)} confirmed successful! Wallet updated.`,
              "success",
            );
            await refreshWallet();
          } else if (
            updated &&
            (updated.status === "rejected" ||
              updated.status === "cancelled" ||
              updated.status === "failed")
          ) {
            showToast(
              `Payment #${txId.substring(0, 8)}: ${updated.failureReason || "Failed or rejected."}`,
              "error",
            );
            await refreshWallet();
          } else {
            showToast(
              `Payment #${txId.substring(0, 8)} is still awaiting PIN approval on your phone.`,
              "info",
            );
            btn.disabled = false;
            btn.innerHTML = originalContent;
          }
        } catch (err) {
          showToast(err.message || "Failed to query status.", "error");
          btn.disabled = false;
          btn.innerHTML = originalContent;
        }
      });
    });
  }
}

function setupDepositForm() {
  const depositForm = $("#deposit-form");
  if (!depositForm) return;

  const amountInput = $("#deposit-amount");
  const bonusInfo = $("#bonus-info");
  const manualWhatsappBtn = $("#manual-whatsapp-btn");
  const flatBonus = 0.05;

  // FIX: Idempotency Key Lifecycle. Only regenerate explicitly on success or reset.
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
    amountInput.addEventListener("input", () => {
      updateBonusInfo();
    });
  }

  const paymentRadios = depositForm.querySelectorAll(
    'input[name="payment-method"]',
  );
  const dynamicFields = depositForm.querySelectorAll(".dynamic-fields");
  const paymentTiles = depositForm.querySelectorAll(".payment-tile");

  paymentRadios.forEach((radio) => {
    radio.addEventListener("change", (e) => {
      const selectedMethod = e.target.value;
      dynamicFields.forEach((field) => (field.style.display = "none"));
      const targetField = document.getElementById(`${selectedMethod}-fields`);
      if (targetField) targetField.style.display = "block";
      paymentTiles.forEach((tile) => {
        const input = tile.querySelector("input");
        tile.classList.toggle("active", input.checked);
      });
      if (selectedMethod === "manual") updateManualWhatsappLink();
    });
  });

  depositForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const submitBtn = depositForm.querySelector('button[type="submit"]');
    if (!submitBtn || submitBtn.disabled || depositSubmitting) return; // FIX: Prevent rapid repeated clicks

    const originalBtnText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = "Processing...";
    depositSubmitting = true;

    const amount = parseFloat(amountInput.value);
    const selectedMethodInput = depositForm.querySelector(
      'input[name="payment-method"]:checked',
    );

    if (!selectedMethodInput) {
      showToast("Please select a payment method", "error");
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnText;
      depositSubmitting = false;
      return;
    }
    if (!amount || amount <= 0) {
      showToast("Please enter a valid amount", "error");
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnText;
      depositSubmitting = false;
      return;
    }

    const method = selectedMethodInput.value;

    if (method === "card") {
      // Pass control to card handler, keep main form locked until sheet is closed/canceled
      handleCardPayment(
        amount,
        currentIdempotencyKey,
        submitBtn,
        originalBtnText,
      );
      return;
    }

    showToast("Processing deposit request...", "info");

    let payload = {
      amount,
      method,
      email: userEmail,
      idempotencyKey: currentIdempotencyKey,
    };

    if (method === "mtn" || method === "airtel") {
      payload.phoneNumber = formatUgPhone($(`#${method}-phone`)?.value);
      if (!payload.phoneNumber || payload.phoneNumber.length < 12) {
        showToast(
          `Enter a valid ${method.toUpperCase()} number (e.g., 07XXXXXXXX)`,
          "error",
        );
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
        depositSubmitting = false;
        return;
      }
    } else if (method === "manual") {
      const fileInput = $("#manual-receipt");
      if (fileInput && fileInput.files.length > 0) {
        payload.receipt = fileInput.files[0].name;
      }
    }

    try {
      const res = await api.createDeposit(payload);

      // FIX: Track the active payment ID if returned
      if (res?.data?.id) {
        activePaymentId = res.data.id;
      }

      // Handle backend idempotency response (200 OK means it already existed)
      const isExisting = res.status === 200;

      if (method === "mtn" || method === "airtel") {
        showToast(
          "Request sent! A prompt will appear on your phone. Please enter your PIN to approve the deposit.",
          "info",
        );
      } else if (method === "manual") {
        showToast(
          "Deposit request created! Please click the WhatsApp button to send your receipt.",
          "info",
        );
        // Manual payments don't need to lock the form indefinitely
        depositForm.reset();
        dynamicFields.forEach((field) => (field.style.display = "none"));
        paymentTiles.forEach((tile) => tile.classList.remove("active"));
        if (bonusInfo)
          bonusInfo.innerHTML = `Bonus: ${formatCurrency(0)} <span class="bonus-amount">Total Credited: ${formatCurrency(0)}</span>`;
        regenerateKey(); // Safe to regenerate for manual since it's instant
      }

      if (method === "mtn" || method === "airtel") {
        // Don't reset form or regenerate key until terminal status is reached
        // Keep submitBtn disabled and let polling handle the unlock
        checkPendingAndShowCancel();
      } else {
        await refreshWallet();
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
        depositSubmitting = false;
      }
    } catch (error) {
      showToast(
        error.message || "Failed to submit deposit. Please try again.",
        "error",
      );
      // FIX: Do NOT regenerate key on failure. User can retry with the SAME key safely.
      // Unlock form so they can press the button again to retry
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnText;
      depositSubmitting = false;
    }
  });
}

async function handleCardPayment(
  amount,
  idempotencyKey,
  submitBtn,
  originalBtnText,
) {
  // submitBtn is already disabled and depositSubmitting is true from the caller

  const sheet = document.getElementById("cardPaymentSheet");
  const sheetAmount = document.getElementById("cardSheetAmount");
  const confirmBtn = document.getElementById("confirmCardPayBtn");
  const cancelBtn = document.getElementById("cancelCardPayBtn");

  if (!sheet || !confirmBtn) {
    // FIX: Restore UI if sheet elements are missing
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalBtnText;
    depositSubmitting = false;
    return;
  }

  sheetAmount.textContent = formatCurrency(amount);
  sheet.style.display = "flex";
  requestAnimationFrame(() => sheet.classList.add("active"));

  const closeSheet = () => {
    sheet.classList.remove("active");
    setTimeout(() => (sheet.style.display = "none"), 200);
    confirmBtn.disabled = false;
    confirmBtn.innerText = "Continue to Secure Checkout";

    // FIX: Only unlock the main form when the sheet is canceled or closed without success
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalBtnText;
    depositSubmitting = false;
  };

  cancelBtn.onclick = closeSheet;
  sheet.onclick = (e) => {
    if (e.target === sheet) closeSheet();
  };

  confirmBtn.onclick = async () => {
    if (confirmBtn.disabled) return;
    confirmBtn.disabled = true;
    confirmBtn.innerText = "Redirecting to secure checkout...";

    try {
      const res = await api.createDeposit({
        amount,
        method: "card",
        email: userEmail,
        idempotencyKey,
      });
      if (res?.data?.id) {
        activePaymentId = res.data.id;
      }

      if (res?.data?.redirect_url) {
        window.location.href = res.data.redirect_url;
        return;
      }

      // If no redirect URL but successful, it means it's an existing active payment
      showToast(
        "Payment already initiated. Waiting for gateway confirmation...",
        "info",
      );
      closeSheet(); // Close sheet, but keep main form locked if it's still pending
      checkPendingAndShowCancel();
    } catch (error) {
      showToast(error.message || "Failed to initiate card payment.", "error");
      // Allow retry on the confirm button
      confirmBtn.disabled = false;
      confirmBtn.innerText = "Continue to Secure Checkout";
      // Keep main submitBtn disabled, user can either try again or cancel the sheet
    }
  };
}

async function checkPendingAndShowCancel() {
  const depositForm = $("#deposit-form");
  if (!depositForm) return;

  const submitBtn = depositForm.querySelector('button[type="submit"]');

  // FIX: Always clear existing interval before starting a new one to prevent duplicates
  if (pendingPollInterval) {
    clearInterval(pendingPollInterval);
    pendingPollInterval = null;
  }

  try {
    const res = await api.getPayments();
    const userPayments = res.data || [];

    // FIX: Treat both 'pending' AND 'processing' as active payments
    let activePayment = userPayments.find(
      (p) =>
        (p.status === "pending" || p.status === "processing") &&
        (p.method === "mtn" || p.method === "airtel"),
    );

    // Fallback if user just submitted and payments array hasn't updated yet
    if (!activePayment && activePaymentId) {
      activePayment = { id: activePaymentId, method: "mtn", status: "pending" };
    }

    if (activePayment) {
      activePaymentId = activePayment.id;

      // Immediate one-off live reconciliation check with PesaJet status
      try {
        const liveRes = await api.getPaymentStatus(activePayment.id);
        const liveStatus = liveRes?.data?.status;
        if (
          liveStatus &&
          [
            "completed",
            "approved",
            "rejected",
            "cancelled",
            "expired",
          ].includes(liveStatus)
        ) {
          cleanupPolling();
          currentIdempotencyKey = generateUUID();
          await refreshWallet();
          return;
        }
      } catch (checkErr) {
        console.warn(
          "[Wallet] Immediate live check skipped:",
          checkErr.message,
        );
      }

      // Disable the Process Deposit button and show waiting text
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = "Waiting for phone PIN approval... ⏳";
      }

      renderActiveDepositBanner(activePayment);
      pollAttempts = 0;
      // Start responsive polling every 4 seconds
      pendingPollInterval = setInterval(pollPaymentStatus, 4000);
    } else {
      // No active payments, ensure form is unlocked and banner removed
      cleanupPolling();
    }
  } catch (e) {
    console.error("Failed to check pending deposits", e);
    // Don't lock the user out if the API fails
    if (submitBtn && !depositSubmitting) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = "Process Deposit";
    }
  }
}

// FIX: Dedicated polling function utilizing PesaJet live status endpoint
async function pollPaymentStatus(isManual = false) {
  if (!activePaymentId) {
    cleanupPolling();
    return;
  }

  pollAttempts++;

  try {
    let targetPayment = null;
    try {
      // Primary: Hit SMMMARIA backend status endpoint which live-queries PesaJet and auto-settles
      const statusRes = await api.getPaymentStatus(activePaymentId);
      if (statusRes && statusRes.data) {
        targetPayment = statusRes.data;
      }
    } catch (statusErr) {
      console.warn(
        "[Wallet] Status endpoint poll warning, falling back to getPayments:",
        statusErr.message,
      );
      const res = await api.getPayments();
      const payments = res.data || [];
      targetPayment = payments.find((p) => p.id === activePaymentId);
    }

    // If payment not found, or reached a terminal state
    if (!targetPayment) {
      cleanupPolling();
      return;
    }

    const status = targetPayment.status;

    if (status === "completed" || status === "approved") {
      cleanupPolling();
      showToast("Deposit successful! Your wallet has been updated.", "success");
      currentIdempotencyKey = generateUUID();
      await refreshWallet();
      const depositForm = $("#deposit-form");
      if (depositForm) {
        const amountInput = $("#deposit-amount");
        if (amountInput) amountInput.value = "";
      }
    } else if (status === "rejected" || status === "failed") {
      cleanupPolling();
      showToast(
        targetPayment.failureReason ||
          "Deposit was rejected. Please try again.",
        "error",
      );
      await refreshWallet();
    } else if (status === "cancelled") {
      cleanupPolling();
      showToast("Deposit was cancelled.", "info");
      await refreshWallet();
    } else if (status === "expired") {
      cleanupPolling();
      showToast("Deposit request expired. Please try again.", "info");
      await refreshWallet();
    } else {
      // Still pending or processing
      if (isManual) {
        showToast(
          "Payment is still awaiting PIN confirmation on your phone.",
          "info",
        );
      }

      // Continue polling continuously without premature cutoff
    }
  } catch (e) {
    console.error("Polling error:", e);
    // Do not stop polling on temporary network errors, just try again next interval
  }
}

function cleanupPolling() {
  if (pendingPollInterval) {
    clearInterval(pendingPollInterval);
    pendingPollInterval = null;
  }
  removeActiveDepositBanner();
  activePaymentId = null;
  pollAttempts = 0;
  depositSubmitting = false;

  const depositForm = $("#deposit-form");
  const submitBtn = depositForm?.querySelector('button[type="submit"]');
  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.innerHTML = "Process Deposit";
  }
}

function renderActiveDepositBanner(payment) {
  const depositForm = $("#deposit-form");
  if (!depositForm) return;

  let banner = document.getElementById("active-deposit-banner");
  if (!banner) {
    banner = document.createElement("div");
    banner.id = "active-deposit-banner";
    banner.style.cssText = `
      background: rgba(244, 179, 66, 0.12);
      border: 1px solid var(--color-gold, #f4b342);
      border-radius: 10px;
      padding: 14px 16px;
      margin-top: 15px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    `;
    const submitBtn = depositForm.querySelector('button[type="submit"]');
    if (submitBtn && submitBtn.parentNode) {
      submitBtn.parentNode.insertBefore(banner, submitBtn.nextSibling);
    }
  }

  const shortId = payment?.id ? `#${payment.id.substring(0, 8)}` : "";
  const methodLabel = payment?.method
    ? payment.method.toUpperCase()
    : "Mobile Money";

  banner.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="font-size: 16px;">📲</span>
        <span style="font-size: 13px; font-weight: 600; color: var(--color-gold, #f4b342);">
          ${methodLabel} Prompt Sent (${shortId})
        </span>
      </div>
      <span style="font-size: 12px; color: var(--text-secondary, #b8c2d8);">
        Polling live gateway status...
      </span>
    </div>
    <div style="font-size: 12px; color: var(--text-secondary, #b8c2d8); line-height: 1.4;">
      Please enter your PIN on your phone to approve the deposit. This screen updates automatically upon confirmation.
    </div>
    <div style="display: flex; gap: 10px; margin-top: 4px;">
      <button type="button" id="btn-manual-check-status" class="btn btn--outline btn--sm" style="flex: 1; font-size: 12px; padding: 6px 12px; display: flex; align-items: center; justify-content: center; gap: 6px;">
        <span>Query Status Now</span> <span>🔄</span>
      </button>
      <button type="button" id="btn-cancel-pending-deposit" class="btn btn--outline btn--sm text-danger" style="font-size: 12px; padding: 6px 12px; border-color: rgba(239,68,68,0.4);">
        Cancel
      </button>
    </div>
  `;

  const checkBtn = document.getElementById("btn-manual-check-status");
  if (checkBtn) {
    checkBtn.onclick = async () => {
      checkBtn.disabled = true;
      checkBtn.innerHTML = "<span>Checking...</span> <span>⏳</span>";
      await pollPaymentStatus(true);
      if (activePaymentId) {
        checkBtn.disabled = false;
        checkBtn.innerHTML = "<span>Query Status Now</span> <span>🔄</span>";
      }
    };
  }

  const cancelBtn = document.getElementById("btn-cancel-pending-deposit");
  if (cancelBtn) {
    cancelBtn.onclick = async () => {
      if (!confirm("Are you sure you want to cancel this pending deposit?"))
        return;
      cancelBtn.disabled = true;
      cancelBtn.innerText = "Cancelling...";
      try {
        await api.cancelPendingDeposit();
        showToast("Pending deposit cancelled.", "info");
        cleanupPolling();
        currentIdempotencyKey = generateUUID();
        await refreshWallet();
      } catch (err) {
        showToast(err.message || "Failed to cancel deposit.", "error");
        cancelBtn.disabled = false;
        cancelBtn.innerText = "Cancel";
      }
    };
  }
}

function removeActiveDepositBanner() {
  const banner = document.getElementById("active-deposit-banner");
  if (banner && banner.parentNode) {
    banner.parentNode.removeChild(banner);
  }
}
