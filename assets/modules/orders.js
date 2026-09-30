// ===============================================
// Orders Module
// ===============================================

import { api } from '../utils/api.js';
import { $ } from '../utils/helpers.js';
import { formatCurrency } from '../modules/currency.js';
import { formatDate } from '../utils/formatter.js';

let serviceMap = {};
let currentOrders = [];
let countdownInterval = null;
let isRefillListenerAttached = false;

/**
 * Safely escapes HTML strings to prevent XSS when injecting API data.
 */
function escapeHtml(unsafe) {
    if (typeof unsafe !== 'string') return unsafe;
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/**
 * Calculates real progress percentage based on quantity and remains.
 * Returns null if progress cannot be determined.
 */
function calculateProgress(order) {
    if (order.status === 'completed') return 100;
    if (order.status === 'pending') return 0;
    
    if (typeof order.remains !== 'undefined' && order.remains !== null && order.quantity > 0) {
        const delivered = order.quantity - order.remains;
        let progress = (delivered / order.quantity) * 100;
        
        if (order.status === 'processing' || order.status === 'in_progress') {
            progress = Math.max(0, Math.min(99, progress));
        } else {
            progress = Math.max(0, Math.min(100, progress));
        }
        return progress;
    }
    
    return null; // Unavailable
}

/**
 * Determines refill eligibility based on backend timestamps.
 * Falls back to 24 hours after createdAt if no specific refill timestamp exists.
 */
function getRefillData(order) {
    const now = Date.now();
    let targetTime = null;
    
    // Check for explicit backend refill fields
    const refillAt = order.refillAvailableAt || order.refill_at || order.completedAt;
    
    if (refillAt) {
        targetTime = new Date(refillAt).getTime();
    } else if (order.createdAt) {
        // Fallback: 24 hours after creation
        targetTime = new Date(order.createdAt).getTime() + (24 * 60 * 60 * 1000);
    }
    
    if (!targetTime) {
        return { ready: true, msRemaining: 0, targetTime: 0 };
    }
    
    const msRemaining = targetTime - now;
    if (msRemaining <= 0) {
        return { ready: true, msRemaining: 0, targetTime };
    }
    
    return { ready: false, msRemaining, targetTime };
}

function formatCountdown(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours}h ${minutes}m ${seconds}s`;
}

export default async function initOrders() {
    const tbody = $('.datatable tbody');
    if (!tbody) return;
    
    try {
        const [ordersRes, servicesRes] = await Promise.all([
            api.getOrders(),
            api.getServices()
        ]);
        
        currentOrders = ordersRes.data || [];
        const services = servicesRes.data || [];
        
        services.forEach(s => {
            serviceMap[s.id] = {
                name: s.name,
                supplierServiceId: s.supplierServiceId
            };
        });
        
        renderOrders();
        renderActiveOrders();
        startCountdownTimer();
        
        // Listen for currency changes to re-render charges
        window.addEventListener('currencyChanged', () => {
            renderOrders();
            renderActiveOrders();
            startCountdownTimer();
        });
        
        // Setup global event listener for refill buttons (only once)
        if (!isRefillListenerAttached) {
            document.body.addEventListener('click', (e) => {
                const btn = e.target.closest('.refill-btn');
                if (btn && btn.dataset.refillReady === 'true') {
                    const orderId = btn.dataset.orderId;
                    const link = btn.dataset.link || '';
                    if (orderId) {
                        window.location.href = `refill.html?order=${encodeURIComponent(orderId)}&link=${encodeURIComponent(link)}`;
                    }
                }
            });
            isRefillListenerAttached = true;
        }
        
    } catch (error) {
        tbody.innerHTML = `<tr><td colspan="12" class="text-center text-danger">Failed to load orders. Please try again later.</td></tr>`;
        const activeContainer = $('#currentOrdersList');
        if (activeContainer) {
            activeContainer.innerHTML = `<div class="empty-state-box"><p class="text-danger">Failed to load active orders.</p></div>`;
        }
        console.error('Failed to load orders:', error);
    }
    
    function renderOrders() {
        if (currentOrders.length === 0) {
            tbody.innerHTML = `<tr><td colspan="12" class="text-center text-muted">No orders found. Place your first order from the New Order page!</td></tr>`;
            return;
        }
        
        tbody.innerHTML = currentOrders.map(order => {
            const serviceData = serviceMap[order.serviceId] || {
                name: `ID: ${order.serviceId?.substring(0, 8)}`,
                supplierServiceId: 'N/A'
            };
            const serviceName = escapeHtml(serviceData.name);
            const supplierServiceId = escapeHtml(serviceData.supplierServiceId || 'N/A');
            const shortName = serviceName.length > 25 ? serviceName.substring(0, 25) + '...' : serviceName;
            
            const progress = calculateProgress(order);
            const progressHtml = progress !== null ? `
                <div class="progress-bar">
                    <div class="progress-bar__fill" style="width: ${progress.toFixed(0)}%;"></div>
                </div>
            ` : `<span class="text-muted">N/A</span>`;
            
            const remainsCount = order.remains || 0;
            const remainsClass = remainsCount > 0 ? 'text-danger font-weight-bold' : 'text-muted';
            
            const refillData = getRefillData(order);
            const refillHtml = refillData.ready ? `
                <button class="btn btn--outline btn--sm refill-btn" data-order-id="${escapeHtml(order.id)}" data-link="${escapeHtml(order.link || '')}" data-refill-ready="true">Refill</button>
            ` : `
                <button class="btn btn--outline btn--sm refill-btn" data-order-id="${escapeHtml(order.id)}" data-link="${escapeHtml(order.link || '')}" data-refill-target="${refillData.targetTime}" data-refill-ready="false" disabled>
                    <span class="refill-timer-text">${formatCountdown(refillData.msRemaining)}</span>
                </button>
            `;
            
            const safeLink = escapeHtml(order.link || '#');
            
            return `
                <tr>
                    <td>#${escapeHtml(order.id?.substring(0, 8) || 'N/A')}</td>
                    <td title="${serviceName}">${shortName}</td>
                    <td>
                        <a href="new-order.html?id=${escapeHtml(order.serviceId)}" class="service-id-link" title="Re-order this service">
                            ${supplierServiceId}
                        </a>
                    </td>
                    <td><a href="${safeLink}" target="_blank" rel="noopener noreferrer" class="text-link">View Link</a></td>
                    <td>${order.quantity?.toLocaleString() || 0}</td>
                    <td>${order.start_count?.toLocaleString() || 0}</td>
                    <td class="${remainsClass}">${remainsCount.toLocaleString()}</td>
                    <td>${formatCurrency(order.charge)}</td>
                    <td><span class="badge badge--${escapeHtml(order.status)}">${escapeHtml(order.status)}</span></td>
                    <td>${progressHtml}</td>
                    <td>${formatDate(order.createdAt)}</td>
                    <td>${refillHtml}</td>
                </tr>
            `;
        }).join('');
    }
    
    function renderActiveOrders() {
        const activeContainer = $('#currentOrdersList');
        if (!activeContainer) return;
        
        const activeStatuses = ['pending', 'processing', 'in_progress'];
        const activeOrders = currentOrders.filter(o => activeStatuses.includes(o.status));
        
        if (activeOrders.length === 0) {
            activeContainer.innerHTML = `
                <div class="empty-state-box">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-4"></path><polyline points="9 11 12 14 15 11"></polyline><line x1="12" y1="2" x2="12" y2="14"></line></svg>
                    <h3>No Active Orders</h3>
                    <p>You currently have no pending or processing orders.</p>
                </div>
            `;
            return;
        }
        
        activeContainer.innerHTML = activeOrders.map(order => {
            const serviceData = serviceMap[order.serviceId] || { name: `ID: ${order.serviceId?.substring(0, 8)}`, supplierServiceId: 'N/A' };
            const serviceName = escapeHtml(serviceData.name);
            const orderIdShort = escapeHtml(order.id?.substring(0, 8) || 'N/A');
            const statusClass = `co-status--${escapeHtml(order.status)}`;
            const safeLink = escapeHtml(order.link || '#');
            
            const progress = calculateProgress(order);
            const progressHtml = progress !== null ? `
                <div class="co-progress-bar-bg">
                    <div class="co-progress-bar-fill" style="width: ${progress.toFixed(0)}%;"></div>
                </div>
            ` : `<div class="co-progress-bar-bg"><div class="co-progress-bar-fill" style="width: 0%;"></div></div>`;
            
            const progressText = progress !== null ? `${progress.toFixed(0)}%` : 'N/A';
            
            const remainsCount = order.remains || 0;
            const delivered = order.quantity - remainsCount;
            
            const refillData = getRefillData(order);
            const refillHtml = refillData.ready ? `
                <button class="btn--primary refill-btn" data-order-id="${escapeHtml(order.id)}" data-link="${escapeHtml(order.link || '')}" data-refill-ready="true">Refill</button>
            ` : `
                <div class="refill-ui">
                    <div class="refill-graphic">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                    </div>
                    <div class="refill-info">
                        <span class="refill-label">Refill in</span>
                        <span class="refill-countdown" data-refill-target="${refillData.targetTime}">${formatCountdown(refillData.msRemaining)}</span>
                    </div>
                    <button class="btn--primary refill-btn" data-order-id="${escapeHtml(order.id)}" data-link="${escapeHtml(order.link || '')}" data-refill-ready="false" disabled>Locked</button>
                </div>
            `;
            
            return `
                <div class="co-card">
                    <div class="co-header">
                        <div class="co-header-left">
                            <h4>${serviceName}</h4>
                            <span class="co-order-id">Order #${orderIdShort}</span>
                        </div>
                        <span class="co-status ${statusClass}">${escapeHtml(order.status)}</span>
                    </div>
                    <a href="${safeLink}" target="_blank" rel="noopener noreferrer" class="co-link">${safeLink}</a>
                    <div class="co-progress-wrapper">
                        <div class="co-progress-top">
                            <span>Progress</span>
                            <span>${progressText}</span>
                        </div>
                        ${progressHtml}
                    </div>
                    <div class="co-stats-grid">
                        <div class="co-stat-item">
                            <span class="co-stat-label">Quantity</span>
                            <span class="co-stat-value">${order.quantity?.toLocaleString() || 0}</span>
                        </div>
                        <div class="co-stat-item">
                            <span class="co-stat-label">Delivered</span>
                            <span class="co-stat-value">${delivered.toLocaleString()}</span>
                        </div>
                        <div class="co-stat-item">
                            <span class="co-stat-label">Remaining</span>
                            <span class="co-stat-value">${remainsCount.toLocaleString()}</span>
                        </div>
                    </div>
                    <div class="co-footer">
                        <div class="co-charge">
                            <span class="co-charge-label">Charge</span>
                            <span class="co-charge-value">${formatCurrency(order.charge)}</span>
                        </div>
                        ${refillHtml}
                    </div>
                </div>
            `;
        }).join('');
    }
    
    function startCountdownTimer() {
        if (countdownInterval) clearInterval(countdownInterval);
        
        const updateTimers = () => {
            const pendingTimers = document.querySelectorAll('[data-refill-target]');
            
            if (pendingTimers.length === 0) {
                clearInterval(countdownInterval);
                countdownInterval = null;
                return;
            }
            
            const now = Date.now();
            let activeTimersFound = false;
            
            pendingTimers.forEach(el => {
                const target = parseInt(el.dataset.refillTarget, 10);
                const msRemaining = target - now;
                
                if (msRemaining <= 0) {
                    // Timer expired: Enable the button
                    const container = el.closest('.co-footer') || el.closest('td');
                    if (container) {
                        const btn = container.querySelector('.refill-btn');
                        if (btn && btn.dataset.refillReady === 'false') {
                            btn.removeAttribute('disabled');
                            btn.dataset.refillReady = 'true';
                            btn.innerText = 'Refill';
                            
                            // If it's in the card, hide the refill-ui graphic
                            const refillUi = container.querySelector('.refill-ui');
                            if (refillUi) refillUi.style.display = 'none';
                        }
                    }
                    el.remove();
                } else {
                    activeTimersFound = true;
                    el.innerText = formatCountdown(msRemaining);
                    
                    // Also update the table button text if it's a table timer
                    if (el.classList.contains('refill-timer-text')) {
                        el.innerText = formatCountdown(msRemaining);
                    }
                }
            });
            
            if (!activeTimersFound) {
                clearInterval(countdownInterval);
                countdownInterval = null;
            }
        };
        
        updateTimers(); // Run immediately
        countdownInterval = setInterval(updateTimers, 1000);
    }
}