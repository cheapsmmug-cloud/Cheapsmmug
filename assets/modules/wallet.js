// ===============================================
// Wallet Module
// ===============================================

import { api } from "../utils/api.js";
import { $, generateUUID } from "../utils/helpers.js";
import { formatCurrency } from "../modules/currency.js";
import { formatDate } from "../utils/formatter.js";
import { showToast } from "../components/toast.js";

// ===============================================
// MODULE STATE
// ===============================================

let currentBalance = 0;
let currentTransactions = [];
let pendingPollInterval = null;
let backgroundRefreshInterval = null;
let walletInitialized = false;
let depositSubmitting = false;
let activePaymentId = null;
let userEmail = "guest@smmmaria.com";
let currentIdempotencyKey = generateUUID();
let pollAttempts = 0;

// ===============================================
// PHONE NUMBER FORMATTING
// ===============================================

function formatUgPhone(phone) {
  if (!phone) return "";

  phone = phone.replace(/\s+/g, "").replace(/^\+/, "");

  if (phone.startsWith("256")) return phone;
  if (phone.startsWith("0")) return "256" + phone.substring(1);

  return phone;
}

// ===============================================
// INITIALIZE WALLET
// ===============================================

export default async function initWallet() {
  if (walletInitialized) {
    return refreshWallet();
  }

  walletInitialized = true;

  // Attach form listeners immediately. Do not make payment-method
  // selection wait for network requests to finish.
  setupDepositForm();

  window.addEventListener("currencyChanged", updateWalletUI);

  // Load profile and wallet independently so one slow request does not
  // prevent the other from completing.
  const profileRequest = api.getMe()
    .then((meRes) => {
      const me = meRes?.data ?? meRes;
      if (me?.email) userEmail = me.email;
    })
    .catch((error) => {
      console.warn("Could not fetch user email for payment gateway:", error);
    });

  await refreshWallet();
  await profileRequest;

  await checkPendingAndShowCancel();

  startBackgroundRefresh();

  window.addEventListener("beforeunload", () => {
    if (pendingPollInterval) clearInterval(pendingPollInterval);
    if (backgroundRefreshInterval) clearInterval(backgroundRefreshInterval);
  }, { once: true });
}

// ===============================================
// BACKGROUND WALLET REFRESH
// ===============================================

function startBackgroundRefresh() {
  if (backgroundRefreshInterval) {
    clearInterval(backgroundRefreshInterval);
  }

  backgroundRefreshInterval = setInterval(async () => {
    if (document.hidden) return;

    await refreshWallet();
    await checkPendingAndShowCancel();
  }, 15000);

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      refreshWallet();
      checkPendingAndShowCancel();
    }
  });
}

// ===============================================
// REFRESH WALLET DATA
// ===============================================

async function refreshWallet() {
  const balanceEl = $(".balance-card__amount");
  const tbody = $(".transactions-card tbody");

  try {
    const response = await api.getWallet();

    // The API may return either { data: { balance, transactions } }
    // or the wallet object directly. Support both without changing
    // the backend contract.
    const walletData = response?.data ?? response;

    if (!walletData || typeof walletData !== "object") {
      throw new Error("Wallet response was empty or invalid.");
    }

    if (walletData.balance === undefined || walletData.balance === null) {
      throw new Error("The wallet response did not contain a balance field.");
    }

    const parsedBalance = Number(walletData.balance);

    if (!Number.isFinite(parsedBalance)) {
      throw new Error("The wallet balance returned by the server is invalid.");
    }

    currentBalance = parsedBalance;
    currentTransactions = Array.isArray(walletData.transactions)
      ? walletData.transactions
      : [];

    updateWalletUI();

    // Check pending transactions
    const pendingTx = currentTransactions.find(
      (t) =>
        (t.status === "pending" || t.status === "processing") &&
        (t.type === "deposit" || !t.type)
    );

    if (pendingTx && !window._reconcilingTxId) {
      window._reconcilingTxId = pendingTx.id;

      api
        .getPaymentStatus(pendingTx.id)
        .then((res) => {
          window._reconcilingTxId = null;

          const status = res?.data?.status;

          if (
            status &&
            [
              "completed",
              "approved",
              "rejected",
              "cancelled"
            ].includes(status)
          ) {
            refreshWallet();
          }
        })
        .catch(() => {
          window._reconcilingTxId = null;
        });
    }

  } catch (error) {
    console.error("Wallet refresh failed:", error);

    if (balanceEl) {
      balanceEl.textContent = "Unable to load balance";
    }

    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="text-center text-danger">
            Failed to load wallet data.
          </td>
        </tr>
      `;
    }
  }
}

// ===============================================
// UPDATE WALLET INTERFACE
// ===============================================

function updateWalletUI() {
  const balanceEl = $(".balance-card__amount");
  const tbody = $(".transactions-card tbody");

  // Update balance
  if (balanceEl) {
    balanceEl.textContent = formatCurrency(currentBalance);
  }

  if (!tbody) return;

  // =============================================
  // EMPTY TRANSACTION HISTORY
  // =============================================

  if (!currentTransactions || currentTransactions.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="text-center text-muted">
          No transactions yet. Click Add Funds to make your first deposit!
        </td>
      </tr>

      <tr>
        <td colspan="5"
            style="text-align:center; padding:15px;
                   border-top:2px solid var(--border-color);">

          <button
            id="viewAllTxBtn"
            class="btn btn--outline btn--sm"
            type="button">

            View all transactions

          </button>

        </td>
      </tr>
    `;

    const emptyViewBtn = document.getElementById("viewAllTxBtn");

    if (emptyViewBtn) {
      emptyViewBtn.addEventListener("click", () => {
        window.viewAllWalletTx = true;
        updateWalletUI();
      });
    }

    return;
  }

  // =============================================
  // SORT TRANSACTIONS
  // =============================================

  const sortedTx = [...currentTransactions].sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  );

  // =============================================
  // TRANSACTION DATE CATEGORIES
  // =============================================

  const getCategory = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();

    const today = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );

    const yesterday = new Date(today);

    yesterday.setDate(yesterday.getDate() - 1);

    if (date >= today) return "Today";

    if (date >= yesterday) return "Yesterday";

    if (
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear()
    ) {
      return "This Month";
    }

    return "Older";
  };

  let html = "";
  let lastCategory = "";

  const isViewingAll = window.viewAllWalletTx || false;

  const displayTx = isViewingAll
    ? sortedTx
    : sortedTx.filter(
        (tx) => getCategory(tx.date) === "Today"
      );

  // =============================================
  // NO TRANSACTIONS FOR TODAY
  // =============================================

  if (displayTx.length === 0) {
    if (!isViewingAll) {
      html += `
        <tr style="background:var(--bg-body);">
          <td colspan="5"
              style="font-weight:700; padding:10px 15px;
                     color:var(--text-secondary);
                     text-transform:uppercase;
                     font-size:12px;
                     letter-spacing:0.5px;">

            Today

          </td>
        </tr>

        <tr>
          <td colspan="5"
              class="text-center text-muted"
              style="padding:15px;">

            No transactions done today.

          </td>
        </tr>
      `;
    } else {
      html += `
        <tr>
          <td colspan="5"
              class="text-center text-muted"
              style="padding:15px;">

            No transactions found.

          </td>
        </tr>
      `;
    }
  } else {

    // ===========================================
    // DISPLAY TRANSACTIONS
    // ===========================================

    displayTx.forEach((tx) => {
      const category = getCategory(tx.date);

      if (isViewingAll || category === "Today") {
        if (category !== lastCategory) {
          html += `
            <tr style="background:var(--bg-body);">
              <td colspan="5"
                  style="font-weight:700;
                         padding:10px 15px;
                         color:var(--text-secondary);
                         text-transform:uppercase;
                         font-size:12px;
                         letter-spacing:0.5px;">

                ${category}

              </td>
            </tr>
          `;

          lastCategory = category;
        }
      }

      // Transaction status
      let badgeHtml = "";

      if (
        tx.status === "approved" ||
        tx.status === "completed"
      ) {
        badgeHtml = `
          <span class="badge badge--success">
            ${tx.status}
          </span>
        `;
      } else if (
        tx.status === "rejected" ||
        tx.status === "cancelled" ||
        tx.status === "failed"
      ) {
        badgeHtml = `
          <span class="badge badge--danger">
            ${tx.status}
          </span>
        `;
      } else {
        badgeHtml = `
          <button
            class="badge badge--warning btn-check-tx-status"
            data-tx-id="${tx.id}"
            type="button"
            style="
              cursor:pointer;
              border:1px solid rgba(244,179,66,0.4);
              background:rgba(244,179,66,0.15);
              border-radius:6px;
              padding:3px 8px;
              font-weight:600;
              display:inline-flex;
              align-items:center;
              gap:4px;
              font-size:11px;
              transition:all 0.2s;
            "
            title="Query live status from PesaJet">

            <span>${tx.status || "pending"}</span>
            <span>🔄</span>

          </button>
        `;
      }

      const formattedDate = tx.date
        ? formatDate(tx.date)
        : "N/A";

      const isCredit =
        tx.type === "deposit" ||
        tx.type === "refund";

      html += `
        <tr>

          <td>
            #${tx.id ? tx.id.substring(0, 8) : "N/A"}
          </td>

          <td>
            ${tx.type || "N/A"}
          </td>

          <td class="${isCredit ? "text-success" : "text-danger"}">
            ${isCredit ? "+" : "-"}${formatCurrency(tx.amount || 0)}
          </td>

          <td>
            ${formattedDate}
          </td>

          <td>
            ${badgeHtml}
          </td>

        </tr>
      `;
    });
  }

  // =============================================
  // VIEW ALL / HIDE OLD TRANSACTIONS BUTTON
  // =============================================

  html += `
    <tr>
      <td colspan="5"
          style="text-align:center;
                 padding:15px;
                 border-top:2px solid var(--border-color);">
  `;

  if (!isViewingAll) {
    html += `
      <button
        id="viewAllTxBtn"
        class="btn btn--outline btn--sm"
        type="button">

        View all transactions

      </button>
    `;
  } else {
    html += `
      <button
        id="hideTxBtn"
        class="btn btn--outline btn--sm"
        type="button">

        Hide old transactions

      </button>
    `;
  }

  html += `
      </td>
    </tr>
  `;

  tbody.innerHTML = html;

  // View all button
  const viewBtn = document.getElementById("viewAllTxBtn");

  if (viewBtn) {
    viewBtn.addEventListener("click", () => {
      window.viewAllWalletTx = true;
      updateWalletUI();
    });
  }

  // Hide old transactions button
  const hideBtn = document.getElementById("hideTxBtn");

  if (hideBtn) {
    hideBtn.addEventListener("click", () => {
      window.viewAllWalletTx = false;
      updateWalletUI();
    });
  }

  // =============================================
  // CHECK TRANSACTION STATUS
  // =============================================

  tbody.querySelectorAll(".btn-check-tx-status").forEach((btn) => {

    btn.addEventListener("click", async (e) => {
      e.stopPropagation();

      const txId = btn.getAttribute("data-tx-id");

      if (!txId || btn.disabled) return;

      btn.disabled = true;

      const originalContent = btn.innerHTML;

      btn.innerHTML = `
        <span>Checking...</span>
        <span>⏳</span>
      `;

      try {
        const res = await api.getPaymentStatus(txId);

        const updated = res?.data ?? res;

        if (
          updated &&
          (
            updated.status === "completed" ||
            updated.status === "approved"
          )
        ) {
          showToast(
            `Payment #${txId.substring(0, 8)} confirmed successful! Wallet updated.`,
            "success"
          );

          await refreshWallet();

        } else if (
          updated &&
          (
            updated.status === "rejected" ||
            updated.status === "cancelled" ||
            updated.status === "failed"
          )
        ) {
          showToast(
            `Payment #${txId.substring(0, 8)}: ${
              updated.failureReason || "Failed or rejected."
            }`,
            "error"
          );

          await refreshWallet();

        } else {
          showToast(
            `Payment #${txId.substring(0, 8)} is still awaiting PIN approval on your phone.`,
            "info"
          );

          btn.disabled = false;
          btn.innerHTML = originalContent;
        }

      } catch (err) {
        showToast(
          err.message || "Failed to query status.",
          "error"
        );

        btn.disabled = false;
        btn.innerHTML = originalContent;
      }
    });
  });
}

// ===============================================
// DEPOSIT FORM
// ===============================================

function setupDepositForm() {
  const depositForm = $("#deposit-form");

  if (!depositForm) return;

  const amountInput = $("#deposit-amount");
  const bonusInfo = $("#bonus-info");
  const manualWhatsappBtn = $("#manual-whatsapp-btn");

  const flatBonus = 0.05;

  // =============================================
  // IDEMPOTENCY KEY
  // =============================================

  const regenerateKey = () => {
    currentIdempotencyKey = generateUUID();
  };

  // =============================================
  // MANUAL PAYMENT WHATSAPP LINK
  // =============================================

  const updateManualWhatsappLink = () => {
    if (!manualWhatsappBtn || !amountInput) return;

    const amount = parseFloat(amountInput.value) || 0;

    const message =
      `Hello Admin, I want to deposit ${formatCurrency(amount)} to my SMMMARIA wallet. Here is my payment receipt.`;

    const encodedMessage = encodeURIComponent(message);

    manualWhatsappBtn.href =
      `https://wa.me/256770898186?text=${encodedMessage}`;
  };

  // =============================================
  // BONUS INFORMATION
  // =============================================

  const updateBonusInfo = () => {
    if (!amountInput || !bonusInfo) return;

    const amount = parseFloat(amountInput.value) || 0;

    const total = amount + flatBonus;

    bonusInfo.innerHTML = `
      Bonus: ${formatCurrency(flatBonus)}
      <span class="bonus-amount">
        Total Credited: ${formatCurrency(total)}
      </span>
    `;

    updateManualWhatsappLink();
  };

  if (amountInput && bonusInfo) {
    amountInput.addEventListener("input", () => {
      updateBonusInfo();
    });
  }

  // =============================================
  // PAYMENT METHOD SELECTION
  // =============================================

  const paymentRadios = depositForm.querySelectorAll(
    'input[name="payment-method"]'
  );

  const dynamicFields = depositForm.querySelectorAll(
    ".dynamic-fields"
  );

  const paymentTiles = depositForm.querySelectorAll(
    ".payment-tile"
  );

  const renderSelectedPaymentMethod = () => {

    const selectedRadio = depositForm.querySelector(
      'input[name="payment-method"]:checked'
    );

    const selectedMethod = selectedRadio?.value || null;

    // Hide all payment fields
    dynamicFields.forEach((field) => {
      field.style.display = "none";
    });

    // Show selected payment fields
    if (selectedMethod) {
      const targetField = document.getElementById(
        `${selectedMethod}-fields`
      );

      if (targetField) {
        targetField.style.display = "block";
      }
    }

    // Update selected payment tile
    paymentTiles.forEach((tile) => {
      const input = tile.querySelector(
        'input[name="payment-method"]'
      );

      tile.classList.toggle(
        "active",
        Boolean(input?.checked)
      );
    });

    if (selectedMethod === "manual") {
      updateManualWhatsappLink();
    }
  };

  // Radio button listeners
  paymentRadios.forEach((radio) => {
    radio.addEventListener(
      "change",
      renderSelectedPaymentMethod
    );
  });

  // Mobile tile click support
  paymentTiles.forEach((tile) => {

    tile.addEventListener("click", (event) => {

      const radio = tile.querySelector(
        'input[name="payment-method"]'
      );

      if (!radio) return;

      if (
        event.target !== radio &&
        !radio.checked
      ) {
        radio.checked = true;

        radio.dispatchEvent(
          new Event("change", {
            bubbles: true
          })
        );
      }
    });
  });

  // Show fields for any pre-selected method
  renderSelectedPaymentMethod();

  // =============================================
  // DEPOSIT SUBMISSION
  // =============================================

  depositForm.addEventListener("submit", async (e) => {

    e.preventDefault();

    const submitBtn = depositForm.querySelector(
      'button[type="submit"]'
    );

    if (
      !submitBtn ||
      submitBtn.disabled ||
      depositSubmitting
    ) {
      return;
    }

    const originalBtnText = submitBtn.innerHTML;

    submitBtn.disabled = true;
    submitBtn.innerHTML = "Processing...";

    depositSubmitting = true;

    const amount = parseFloat(amountInput?.value);

    const selectedMethodInput = depositForm.querySelector(
      'input[name="payment-method"]:checked'
    );

    // Validate payment method
    if (!selectedMethodInput) {
      showToast(
        "Please select a payment method",
        "error"
      );

      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnText;

      depositSubmitting = false;

      return;
    }

    // Validate amount
    if (!amount || amount <= 0) {
      showToast(
        "Please enter a valid amount",
        "error"
      );

      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnText;

      depositSubmitting = false;

      return;
    }

    const method = selectedMethodInput.value;

    // ===========================================
    // CARD PAYMENT
    // ===========================================

    if (method === "card") {
      handleCardPayment(
        amount,
        currentIdempotencyKey,
        submitBtn,
        originalBtnText
      );

      return;
    }

    showToast(
      "Processing deposit request...",
      "info"
    );

    // ===========================================
    // PAYMENT PAYLOAD
    // ===========================================

    let payload = {
      amount,
      method,
      email: userEmail,
      idempotencyKey: currentIdempotencyKey
    };

    // ===========================================
    // MTN / AIRTEL PHONE VALIDATION
    // ===========================================

    if (
      method === "mtn" ||
      method === "airtel"
    ) {
      payload.phoneNumber = formatUgPhone(
        $(`#${method}-phone`)?.value
      );

      if (
        !payload.phoneNumber ||
        payload.phoneNumber.length < 12
      ) {
        showToast(
          `Enter a valid ${method.toUpperCase()} number (e.g., 07XXXXXXXX)`,
          "error"
        );

        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;

        depositSubmitting = false;

        return;
      }

    } else if (method === "manual") {

      const fileInput = $("#manual-receipt");

      if (
        fileInput &&
        fileInput.files.length > 0
      ) {
        payload.receipt = fileInput.files[0].name;
      }
    }

    // ===========================================
    // SEND DEPOSIT REQUEST
    // ===========================================

    try {

      const res = await api.createDeposit(payload);

      const paymentData = res?.data ?? res;

      if (paymentData?.id) {
        activePaymentId = paymentData.id;
      }

      if (
        method === "mtn" ||
        method === "airtel"
      ) {
        showToast(
          "Request sent! A prompt will appear on your phone. Please enter your PIN to approve the deposit.",
          "info"
        );

      } else if (method === "manual") {

        showToast(
          "Deposit request created! Please click the WhatsApp button to send your receipt.",
          "info"
        );

        depositForm.reset();

        dynamicFields.forEach((field) => {
          field.style.display = "none";
        });

        paymentTiles.forEach((tile) => {
          tile.classList.remove("active");
        });

        if (bonusInfo) {
          bonusInfo.innerHTML = `
            Bonus: ${formatCurrency(0)}
            <span class="bonus-amount">
              Total Credited: ${formatCurrency(0)}
            </span>
          `;
        }

        regenerateKey();
      }

      // =========================================
      // MOBILE MONEY PAYMENT
      // =========================================

      if (
        method === "mtn" ||
        method === "airtel"
      ) {
        checkPendingAndShowCancel();

      } else {

        await refreshWallet();

        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;

        depositSubmitting = false;
      }

    } catch (error) {

      showToast(
        error.message ||
        "Failed to submit deposit. Please try again.",
        "error"
      );

      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnText;

      depositSubmitting = false;
    }
  });
}

// ===============================================
// CARD PAYMENT HANDLER
// ===============================================

async function handleCardPayment(
  amount,
  idempotencyKey,
  submitBtn,
  originalBtnText
) {

  const sheet = document.getElementById(
    "cardPaymentSheet"
  );

  const sheetAmount = document.getElementById(
    "cardSheetAmount"
  );

  const confirmBtn = document.getElementById(
    "confirmCardPayBtn"
  );

  const cancelBtn = document.getElementById(
    "cancelCardPayBtn"
  );

  if (!sheet || !confirmBtn) {

    submitBtn.disabled = false;
    submitBtn.innerHTML = originalBtnText;

    depositSubmitting = false;

    return;
  }

  if (sheetAmount) {
    sheetAmount.textContent = formatCurrency(amount);
  }

  sheet.style.display = "flex";

  requestAnimationFrame(() => {
    sheet.classList.add("active");
  });

  // =============================================
  // CLOSE PAYMENT SHEET
  // =============================================

  const closeSheet = () => {

    sheet.classList.remove("active");

    setTimeout(() => {
      sheet.style.display = "none";
    }, 200);

    confirmBtn.disabled = false;

    confirmBtn.innerText =
      "Continue to Secure Checkout";

    submitBtn.disabled = false;
    submitBtn.innerHTML = originalBtnText;

    depositSubmitting = false;
  };

  if (cancelBtn) {
    cancelBtn.onclick = closeSheet;
  }

  sheet.onclick = (e) => {
    if (e.target === sheet) {
      closeSheet();
    }
  };

  // =============================================
  // CONFIRM CARD PAYMENT
  // =============================================

  confirmBtn.onclick = async () => {

    if (confirmBtn.disabled) return;

    confirmBtn.disabled = true;

    confirmBtn.innerText =
      "Redirecting to secure checkout...";

    try {

      const res = await api.createDeposit({
        amount,
        method: "card",
        email: userEmail,
        idempotencyKey
      });

      const paymentData = res?.data ?? res;

      if (paymentData?.id) {
        activePaymentId = paymentData.id;
      }

      if (paymentData?.redirect_url) {
        window.location.href =
          paymentData.redirect_url;

        return;
      }

      showToast(
        "Payment already initiated. Waiting for gateway confirmation...",
        "info"
      );

      closeSheet();

      checkPendingAndShowCancel();

    } catch (error) {

      showToast(
        error.message ||
        "Failed to initiate card payment.",
        "error"
      );

      confirmBtn.disabled = false;

      confirmBtn.innerText =
        "Continue to Secure Checkout";
    }
  };
}

// ===============================================
// CHECK PENDING DEPOSITS
// ===============================================

async function checkPendingAndShowCancel() {

  const depositForm = $("#deposit-form");

  if (!depositForm) return;

  const submitBtn = depositForm.querySelector(
    'button[type="submit"]'
  );

  if (pendingPollInterval) {
    clearInterval(pendingPollInterval);

    pendingPollInterval = null;
  }

  try {

    const res = await api.getPayments();

    const paymentsData = res?.data ?? res;
    const userPayments = Array.isArray(paymentsData)
      ? paymentsData
      : paymentsData?.payments || [];

    let activePayment = userPayments.find(
      (p) =>
        (
          p.status === "pending" ||
          p.status === "processing"
        ) &&
        (
          p.method === "mtn" ||
          p.method === "airtel"
        )
    );

    // Fallback for recently submitted payment
    if (!activePayment && activePaymentId) {
      activePayment = {
        id: activePaymentId,
        method: "mtn",
        status: "pending"
      };
    }

    if (activePayment) {

      activePaymentId = activePayment.id;

      // Check live payment status
      try {

        const liveRes = await api.getPaymentStatus(
          activePayment.id
        );

        const liveData = liveRes?.data ?? liveRes;
        const liveStatus = liveData?.status;

        if (
          liveStatus &&
          [
            "completed",
            "approved",
            "rejected",
            "cancelled",
            "expired"
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
          checkErr.message
        );
      }

      // Lock deposit button while payment is pending
      if (submitBtn) {

        submitBtn.disabled = true;

        submitBtn.innerHTML =
          "Waiting for phone PIN approval... ⏳";
      }

      renderActiveDepositBanner(activePayment);

      pollAttempts = 0;

      pendingPollInterval = setInterval(
        pollPaymentStatus,
        4000
      );

    } else {

      cleanupPolling();
    }

  } catch (e) {

    console.error(
      "Failed to check pending deposits",
      e
    );

    if (submitBtn && !depositSubmitting) {

      submitBtn.disabled = false;

      submitBtn.innerHTML =
        "Process Deposit";
    }
  }
}

// ===============================================
// PAYMENT STATUS POLLING
// ===============================================

async function pollPaymentStatus(isManual = false) {

  if (!activePaymentId) {
    cleanupPolling();
    return;
  }

  pollAttempts++;

  try {

    let targetPayment = null;

    try {

      const statusRes = await api.getPaymentStatus(
        activePaymentId
      );

      const statusData = statusRes?.data ?? statusRes;

      if (statusData) {
        targetPayment = statusData;
      }

    } catch (statusErr) {

      console.warn(
        "[Wallet] Status endpoint poll warning, falling back to getPayments:",
        statusErr.message
      );

      const res = await api.getPayments();

      const paymentsData = res?.data ?? res;
      const payments = Array.isArray(paymentsData)
        ? paymentsData
        : paymentsData?.payments || [];

      targetPayment = payments.find(
        (p) => p.id === activePaymentId
      );
    }

    if (!targetPayment) {
      cleanupPolling();
      return;
    }

    const status = targetPayment.status;

    // =========================================
    // SUCCESSFUL PAYMENT
    // =========================================

    if (
      status === "completed" ||
      status === "approved"
    ) {

      cleanupPolling();

      showToast(
        "Deposit successful! Your wallet has been updated.",
        "success"
      );

      currentIdempotencyKey = generateUUID();

      await refreshWallet();

      const depositForm = $("#deposit-form");

      if (depositForm) {

        const amountInput = $("#deposit-amount");

        if (amountInput) {
          amountInput.value = "";
        }
      }

    // =========================================
    // REJECTED PAYMENT
    // =========================================

    } else if (
      status === "rejected" ||
      status === "failed"
    ) {

      cleanupPolling();

      showToast(
        targetPayment.failureReason ||
        "Deposit was rejected. Please try again.",
        "error"
      );

      await refreshWallet();

    // =========================================
    // CANCELLED PAYMENT
    // =========================================

    } else if (status === "cancelled") {

      cleanupPolling();

      showToast(
        "Deposit was cancelled.",
        "info"
      );

      await refreshWallet();

    // =========================================
    // EXPIRED PAYMENT
    // =========================================

    } else if (status === "expired") {

      cleanupPolling();

      showToast(
        "Deposit request expired. Please try again.",
        "info"
      );

      await refreshWallet();

    } else {

      if (isManual) {

        showToast(
          "Payment is still awaiting PIN confirmation on your phone.",
          "info"
        );
      }
    }

  } catch (e) {

    console.error(
      "Polling error:",
      e
    );
  }
}

// ===============================================
// CLEAN UP PAYMENT POLLING
// ===============================================

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

  const submitBtn = depositForm?.querySelector(
    'button[type="submit"]'
  );

  if (submitBtn) {

    submitBtn.disabled = false;

    submitBtn.innerHTML =
      "Process Deposit";
  }
}

// ===============================================
// ACTIVE DEPOSIT BANNER
// ===============================================

function renderActiveDepositBanner(payment) {

  const depositForm = $("#deposit-form");

  if (!depositForm) return;

  let banner = document.getElementById(
    "active-deposit-banner"
  );

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

    const submitBtn = depositForm.querySelector(
      'button[type="submit"]'
    );

    if (
      submitBtn &&
      submitBtn.parentNode
    ) {

      submitBtn.parentNode.insertBefore(
        banner,
        submitBtn.nextSibling
      );
    }
  }

  const shortId = payment?.id
    ? `#${payment.id.substring(0, 8)}`
    : "";

  const methodLabel = payment?.method
    ? payment.method.toUpperCase()
    : "Mobile Money";

  banner.innerHTML = `

    <div style="
      display:flex;
      align-items:center;
      justify-content:space-between;
      flex-wrap:wrap;
      gap:8px;
    ">

      <div style="
        display:flex;
        align-items:center;
        gap:8px;
      ">

        <span style="font-size:16px;">
          📲
        </span>

        <span style="
          font-size:13px;
          font-weight:600;
          color:var(--color-gold, #f4b342);
        ">

          ${methodLabel} Prompt Sent (${shortId})

        </span>

      </div>

      <span style="
        font-size:12px;
        color:var(--text-secondary, #b8c2d8);
      ">

        Polling live gateway status...

      </span>

    </div>

    <div style="
      font-size:12px;
      color:var(--text-secondary, #b8c2d8);
      line-height:1.4;
    ">

      Please enter your PIN on your phone to approve the deposit.
      This screen updates automatically upon confirmation.

    </div>

    <div style="
      display:flex;
      gap:10px;
      margin-top:4px;
    ">

      <button
        type="button"
        id="btn-manual-check-status"
        class="btn btn--outline btn--sm"
        style="
          flex:1;
          font-size:12px;
          padding:6px 12px;
          display:flex;
          align-items:center;
          justify-content:center;
          gap:6px;
        ">

        <span>Query Status Now</span>
        <span>🔄</span>

      </button>

      <button
        type="button"
        id="btn-cancel-pending-deposit"
        class="btn btn--outline btn--sm text-danger"
        style="
          font-size:12px;
          padding:6px 12px;
          border-color:rgba(239,68,68,0.4);
        ">

        Cancel

      </button>

    </div>
  `;

  // =============================================
  // MANUAL STATUS CHECK BUTTON
  // =============================================

  const checkBtn = document.getElementById(
    "btn-manual-check-status"
  );

  if (checkBtn) {

    checkBtn.onclick = async () => {

      checkBtn.disabled = true;

      checkBtn.innerHTML = `
        <span>Checking...</span>
        <span>⏳</span>
      `;

      await pollPaymentStatus(true);

      if (activePaymentId) {

        checkBtn.disabled = false;

        checkBtn.innerHTML = `
          <span>Query Status Now</span>
          <span>🔄</span>
        `;
      }
    };
  }

  // =============================================
  // CANCEL PENDING PAYMENT BUTTON
  // =============================================

  const cancelBtn = document.getElementById(
    "btn-cancel-pending-deposit"
  );

  if (cancelBtn) {

    cancelBtn.onclick = async () => {

      if (
        !confirm(
          "Are you sure you want to cancel this pending deposit?"
        )
      ) {
        return;
      }

      cancelBtn.disabled = true;

      cancelBtn.innerText = "Cancelling...";

      try {

        await api.cancelPendingDeposit();

        showToast(
          "Pending deposit cancelled.",
          "info"
        );

        cleanupPolling();

        currentIdempotencyKey = generateUUID();

        await refreshWallet();

      } catch (err) {

        showToast(
          err.message ||
          "Failed to cancel deposit.",
          "error"
        );

        cancelBtn.disabled = false;

        cancelBtn.innerText = "Cancel";
      }
    };
  }
}

// ===============================================
// REMOVE ACTIVE DEPOSIT BANNER
// ===============================================

function removeActiveDepositBanner() {

  const banner = document.getElementById(
    "active-deposit-banner"
  );

  if (
    banner &&
    banner.parentNode
  ) {

    banner.parentNode.removeChild(banner);
  }
}
