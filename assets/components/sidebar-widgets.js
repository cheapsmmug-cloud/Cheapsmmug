// ===============================================
// SMMMARIA Sidebar Widgets
// ===============================================
import { api } from '../utils/api.js';
import { formatCurrency } from '../utils/formatter.js';

const WIDGET_CONFIG = {
    whatsapp: {
        supportUrl: 'https://wa.me/256770898186',
        groupUrl: 'https://whatsapp.com/channel/0029Vb8lHNMAu3aQdzvGtA1U',
    },
    community: {
        telegram: 'https://t.me/smmmaria',
        whatsapp: 'https://chat.whatsapp.com/2567708981',
        discord: 'https://discord.gg/smmmaria',
    },
    liveChatPath: 'support.html',
    ticketsPath: 'tickets.html',
    services: {
        instagram: 'online',
        tiktok: 'online',
        facebook: 'delayed',
        youtube: 'online',
        telegram: 'online',
        twitter: 'offline',
        spotify: 'online',
    }
};

// Cache DOM references
const DOM = {};

function cacheElements() {
    DOM.balanceValue = document.querySelector('[data-widget="balance-value"]');
    DOM.statTotal = document.querySelector('[data-stat="total-orders"]');
    DOM.statCompleted = document.querySelector('[data-stat="completed-orders"]');
    DOM.statProcessing = document.querySelector('[data-stat="processing-orders"]');
    DOM.statSuccessRate = document.querySelector('[data-stat="success-rate"]');
    DOM.liveChatBtn = document.querySelector('[data-widget="live-chat"]');
    DOM.openTicketBtn = document.querySelector('[data-widget="open-ticket"]');
    DOM.whatsappSupportBtn = document.querySelector('[data-widget="whatsapp-support"]');
    DOM.communityTelegram = document.querySelector('[data-community="telegram"]');
    DOM.communityWhatsapp = document.querySelector('[data-community="whatsapp"]');
    DOM.communityDiscord = document.querySelector('[data-community="discord"]');
    DOM.serviceStatuses = document.querySelectorAll('[data-service-status]');
}

// ===============================================
// 1. ACCOUNT BALANCE & STATISTICS
// ===============================================
async function refreshData() {
    try {
        const token = localStorage.getItem('smmmaria_token');
        if (!token) return; // Don't fetch if not logged in
        
        // Fetch profile and orders simultaneously
        const [meRes, ordersRes] = await Promise.all([
            api.getMe(),
            api.getOrders()
        ]);
        
        const user = meRes.data || {};
        const orders = ordersRes.data || [];
        
        // 1. Render Balance (Uses global formatCurrency!)
        if (DOM.balanceValue) {
            DOM.balanceValue.textContent = formatCurrency(user.balance || 0);
        }
        
        // 2. Compute & Render Stats
        const total = orders.length;
        const completed = orders.filter(o => o.status === 'completed').length;
        const processing = orders.filter(o => o.status === 'processing' || o.status === 'in_progress' || o.status === 'pending').length;
        const rate = total > 0 ? ((completed / total) * 100).toFixed(1) : '0.0';
        
        if (DOM.statTotal) DOM.statTotal.textContent = total;
        if (DOM.statCompleted) DOM.statCompleted.textContent = completed;
        if (DOM.statProcessing) DOM.statProcessing.textContent = processing;
        if (DOM.statSuccessRate) DOM.statSuccessRate.textContent = rate + '%';
        
    } catch (error) {
        console.error('Sidebar widget data fetch failed:', error);
    }
}

// ===============================================
// 2. LINKS & SERVICE STATUS
// ===============================================
function initLinks() {
    if (DOM.liveChatBtn) DOM.liveChatBtn.addEventListener('click', () => window.location.href = WIDGET_CONFIG.liveChatPath);
    if (DOM.openTicketBtn) DOM.openTicketBtn.addEventListener('click', () => window.location.href = WIDGET_CONFIG.ticketsPath);
    if (DOM.whatsappSupportBtn) DOM.whatsappSupportBtn.addEventListener('click', () => window.open(WIDGET_CONFIG.whatsapp.supportUrl, '_blank'));
    
    if (DOM.communityTelegram) DOM.communityTelegram.href = WIDGET_CONFIG.community.telegram;
    if (DOM.communityWhatsapp) DOM.communityWhatsapp.href = WIDGET_CONFIG.community.whatsapp;
    if (DOM.communityDiscord) DOM.communityDiscord.href = WIDGET_CONFIG.community.discord;
}

function renderServiceStatuses() {
    DOM.serviceStatuses.forEach((el) => {
        const service = el.dataset.serviceStatus;
        const status = WIDGET_CONFIG.services[service];
        if (status) {
            el.setAttribute('data-status', status);
            const indicator = el.querySelector('[data-status-indicator]');
            if (indicator) indicator.setAttribute('data-status', status);
        }
    });
}

// ===============================================
// INITIALIZATION
// ===============================================
export async function initSidebarWidgets() {
    cacheElements();
    
    // Don't run on login page
    if (document.body.dataset.page === 'login') return;
    
    await refreshData();
    initLinks();
    renderServiceStatuses();
    
    // Listen for global currency changes to update balance instantly
    window.addEventListener('currencyChanged', () => {
        // We only need to re-render the balance text, not fetch everything again
        // But for simplicity, calling refreshData() is fast enough
        refreshData();
    });
    
    // Optional: Refresh data every 60 seconds
    setInterval(() => {
        if (document.visibilityState === 'visible') refreshData();
    }, 60000);
}