// ===============================================
// Dashboard Module (Currency.js Compatible)
// ===============================================

import { api } from '../utils/api.js';
import { $, $$ } from '../utils/helpers.js';
import { formatDate } from '../utils/formatter.js';
import { getCurrency, formatCurrency } from '../modules/currency.js';

let lastOrdersHash = '';
let lastNotifsHash = '';
let serviceMap = {};
let currentUser = {};
let currentOrders = [];
let currentNotifications = [];

// ===============================================
// New Account Announcements
// ===============================================

async function loadNewAccountAnnouncements() {
    const scrollContainer = document.getElementById('announcementScrollContainer');
    if (!scrollContainer) return;

    try {
        const accountsRef = ref(database, 'accountInventory');
        const snapshot = await get(accountsRef);

        if (!snapshot.exists()) return;

        const accounts = Object.values(snapshot.val());

        const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);

        const newAccounts = accounts.filter(acc =>
            acc.createdAt &&
            acc.createdAt > sevenDaysAgo &&
            acc.status === 'available'
        );

        if (newAccounts.length > 0) {
            if (document.getElementById('new-acc-banner-wrapper')) return;

            const platforms = [...new Set(newAccounts.map(a => a.platform))];

            const newAccountsBanner = `
                <div id="new-acc-banner-wrapper" style="display: flex; align-items: center; gap: 10px; flex-shrink: 0;">
                    <div style="display: flex; align-items: center; gap: 10px; flex-shrink: 0; background: rgba(244, 179, 66, 0.15); padding: 6px 14px; border-radius: 20px; border: 1px solid var(--color-gold);">
                        <span style="color: var(--color-gold); font-weight: 700; font-size: 13px;">🚀 New Accounts Added!</span>
                        <span style="color: var(--text-secondary); font-size: 13px;">${platforms.join(', ')}</span>
                    </div>
                    <a href="buy-account.html" class="btn btn-primary btn-sm" style="flex-shrink: 0; padding: 5px 15px; height: auto; line-height: 1.4;">
                        Buy Account
                    </a>
                </div>
            `;

            scrollContainer.insertAdjacentHTML('beforeend', newAccountsBanner);
        }
    } catch (err) {
        console.error('Failed to load new account announcements:', err);
    }
}

// ===============================================
// Notification Popup
// ===============================================

function checkForNewNotificationPopup(notifications) {
    if (!notifications || notifications.length === 0) return;

    const now = new Date();

    const seenNotifs = JSON.parse(
        localStorage.getItem('smmmaria_seen_notifs') || '[]'
    );

    let popupContent = null;

    for (const n of notifications) {
        const notifDate = new Date(n.createdAt);
        const hoursDiff = (now - notifDate) / (1000 * 60 * 60);

        if (hoursDiff <= 24 && !seenNotifs.includes(n.id)) {
            popupContent = n;
            break;
        }
    }

    if (!popupContent) return;

    seenNotifs.push(popupContent.id);

    localStorage.setItem(
        'smmmaria_seen_notifs',
        JSON.stringify(seenNotifs)
    );

    const modalHTML = `
    <div class="modal-overlay" id="notifPopupModal"
         style="display:flex;position:fixed;top:0;left:0;width:100%;height:100%;
         background:rgba(0,0,0,.6);z-index:2000;justify-content:center;align-items:center;">

      <div class="modal"
           style="background:var(--bg-card);max-width:450px;width:90%;
           border-radius:16px;overflow:hidden;">

        <div class="modal__header"
             style="padding:20px;background:var(--color-gold);color:#fff;
             display:flex;justify-content:space-between;align-items:center;">

          <h3 style="margin:0;">📢 New Announcement</h3>

          <button id="closeNotifPopup"
                  style="background:none;border:none;color:#fff;
                  font-size:24px;cursor:pointer;">
              &times;
          </button>
        </div>

        <div class="modal__body" style="padding:25px;">
            <h4>${popupContent.title || 'Notification'}</h4>
            <p>${popupContent.message}</p>

            <button
                id="acknowledgeNotifBtn"
                class="btn btn--primary btn--block">
                Got it!
            </button>
        </div>
      </div>
    </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const closeModal = () => {
        $('#notifPopupModal')?.remove();
    };

    $('#closeNotifPopup')?.addEventListener('click', closeModal);
    $('#acknowledgeNotifBtn')?.addEventListener('click', closeModal);
}

// ===============================================
// Dashboard Cards
// ===============================================

function updateBalanceUI(user = {}) {
    const balance = Number(user.balance || 0);
    const spent = Number(user.spent || 0);

    $('#walletBalance') &&
        ($('#walletBalance').textContent = formatCurrency(balance));

    $('#totalSpent') &&
        ($('#totalSpent').textContent = formatCurrency(spent));

    $('#walletBalanceUgx') &&
        ($('#walletBalanceUgx').textContent = getCurrency());

    $('#totalSpentUgx') &&
        ($('#totalSpentUgx').textContent = getCurrency());
}

// ===============================================
// FIXED ORDER STATUS COUNTERS
// ===============================================

function updateStatsUI(orders = []) {
    const normalizedOrders = Array.isArray(orders) ? orders : [];

    const getStatus = order =>
        String(order?.status || '')
            .trim()
            .toLowerCase()
            .replace(/\s+/g, '_');

    const completed = normalizedOrders.filter(
        order => getStatus(order) === 'completed'
    ).length;

    const pending = normalizedOrders.filter(order =>
        ['pending', 'processing', 'in_progress'].includes(getStatus(order))
    ).length;

    const cancelled = normalizedOrders.filter(order =>
        ['cancelled', 'canceled', 'failed'].includes(getStatus(order))
    ).length;

    // Match the actual Order Status elements in dashboard.html.
    const pendingValue = $('.status-item--pending .status-item__value');
    const completedValue = $('.status-item--completed .status-item__value');
    const cancelledValue = $('.status-item--cancelled .status-item__value');

    if (pendingValue) pendingValue.textContent = pending;
    if (completedValue) completedValue.textContent = completed;
    if (cancelledValue) cancelledValue.textContent = cancelled;

    // Preserve support for existing stat cards.
    const statCards = $$('.stat-card');

    const setStatCardValue = (index, value) => {
        const valueElement = statCards[index]?.querySelector('.stat-card__value');

        if (valueElement) {
            valueElement.textContent = value;
        }
    };

    setStatCardValue(1, normalizedOrders.length);
    setStatCardValue(2, completed);
    setStatCardValue(3, pending);
    setStatCardValue(4, cancelled);
}

// ===============================================
// Orders Table
// ===============================================

function updateOrdersUI(orders = []) {
    const tbody = $('.recent-orders-card tbody');

    if (!tbody) return;

    if (!orders.length) {
        tbody.innerHTML = `
        <tr>
            <td colspan="4" class="text-center text-muted">
                No recent orders found.
            </td>
        </tr>
        `;
        return;
    }

    tbody.innerHTML = orders
        .slice(0, 5)
        .map(order => {
            const serviceName =
                serviceMap[order.serviceId] ||
                'Unknown Service';

            const shortName =
                serviceName.length > 20
                    ? serviceName.substring(0, 20) + '...'
                    : serviceName;

            return `
            <tr>
                <td>#${order.id?.substring(0, 8) || 'N/A'}</td>
                <td title="${serviceName}">
                    ${shortName}
                </td>
                <td>
                    <span class="badge badge--${order.status}">
                        ${order.status}
                    </span>
                </td>
                <td>${formatCurrency(order.charge || 0)}</td>
            </tr>
            `;
        })
        .join('');
}

// ===============================================
// Helpers for Notifications
// ===============================================

function formatNotificationMessage(text) {
    if (!text) return '';

    let safeText = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    const urlRegex = /(https?:\/\/[^\s]+)/g;

    safeText = safeText.replace(urlRegex, (url) => {
        let cleanUrl = url.replace(/[.,;:!?)\]]$/, '');

        if (cleanUrl.match(/\.(jpeg|jpg|gif|png|webp)$/i)) {
            return `<img src="${cleanUrl}" alt="Notification Media" style="max-width: 100%; max-height: 200px; border-radius: 8px; margin-top: 8px; display: block; cursor: pointer; border: 1px solid rgba(255,255,255,0.1);" onclick="window.open('${cleanUrl}', '_blank')" />`;
        } else if (cleanUrl.match(/\.(mp4|webm|ogg)$/i)) {
            return `<video controls style="max-width: 100%; max-height: 250px; border-radius: 8px; margin-top: 8px; display: block;"><source src="${cleanUrl}"></video>`;
        } else {
            return `<a href="${cleanUrl}" target="_blank" style="color: var(--color-gold, #f5a623); text-decoration: underline; word-break: break-all;">${cleanUrl}</a>`;
        }
    });

    safeText = safeText.replace(/\n/g, '<br>');

    return safeText;
}

// ===============================================
// Notifications UI
// ===============================================

function updateNotificationsUI(notifications = []) {
    const notifList = $('.recent-activity-card .notification-list');

    if (!notifList) return;

    if (!notifications.length) {
        notifList.innerHTML = `
        <li class="notification-item">
            <div class="notification__icon notification__icon--info">
                i
            </div>

            <div class="notification__content">
                <p>No recent notifications.</p>
                <span class="notification__time">
                    Just now
                </span>
            </div>
        </li>
        `;
        return;
    }

    notifList.innerHTML = notifications
        .slice(0, 5)
        .map(n => `
        <li class="notification-item">
            <div class="notification__icon">
                📢
            </div>

            <div class="notification__content">
                <p>
                    <strong>${n.title || 'Notification'}</strong>
                    : ${formatNotificationMessage(n.message)}
                </p>

                <span class="notification__time">
                    ${formatDate(n.createdAt)}
                </span>
            </div>
        </li>
        `)
        .join('');
}

// ===============================================
// Currency Refresh
// ===============================================

function rerenderCurrencySensitiveUI() {
    updateBalanceUI(currentUser);
    updateOrdersUI(currentOrders);
}

// ===============================================
// Background Refresh
// ===============================================

async function refreshDashboardBackground() {
    try {
        const [meRes, ordersRes, notifRes] =
            await Promise.all([
                api.getMe(),
                api.getOrders(),
                api.getNotifications()
            ]);

        currentUser = meRes.data || {};
        currentOrders = ordersRes.data || [];
        currentNotifications = notifRes.data || [];

        updateBalanceUI(currentUser);
        updateStatsUI(currentOrders);

        checkForNewNotificationPopup(currentNotifications);

        const ordersHash = JSON.stringify(
            currentOrders.slice(0, 5)
        );

        if (ordersHash !== lastOrdersHash) {
            lastOrdersHash = ordersHash;
            updateOrdersUI(currentOrders);
        }

        const notifHash = JSON.stringify(
            currentNotifications.slice(0, 5)
        );

        if (notifHash !== lastNotifsHash) {
            lastNotifsHash = notifHash;
            updateNotificationsUI(currentNotifications);
        }

    } catch (error) {
        console.warn(
            'Dashboard refresh failed:',
            error.message
        );
    }
}

// ===============================================
// Init Dashboard
// ===============================================

export default async function initDashboard() {
    try {
        const [
            meRes,
            ordersRes,
            servicesRes,
            notifRes
        ] = await Promise.all([
            api.getMe(),
            api.getOrders(),
            api.getServices(),
            api.getNotifications()
        ]);

        currentUser = meRes.data || {};
        currentOrders = ordersRes.data || [];
        currentNotifications = notifRes.data || [];

        serviceMap = {};

        (servicesRes.data || []).forEach(service => {
            serviceMap[service.id] = service.name;
        });

        updateBalanceUI(currentUser);
        updateStatsUI(currentOrders);
        updateOrdersUI(currentOrders);
        updateNotificationsUI(currentNotifications);

        checkForNewNotificationPopup(currentNotifications);

        const chartContainer = $('#chart-revenue');

        if (chartContainer) {
            const mockData = [
                40, 65, 50, 80,
                55, 90, 70
            ];

            chartContainer.innerHTML = mockData
                .map(h =>
                    `<div class="chart-bar" style="height:${h}%"></div>`
                )
                .join('');
        }

        lastOrdersHash = JSON.stringify(
            currentOrders.slice(0, 5)
        );

        lastNotifsHash = JSON.stringify(
            currentNotifications.slice(0, 5)
        );

        window.addEventListener(
            'currencyChanged',
            rerenderCurrencySensitiveUI
        );

        setInterval(
            refreshDashboardBackground,
            15000
        );

    } catch (error) {
        console.error(
            'Failed to load dashboard:',
            error
        );
    }
}
