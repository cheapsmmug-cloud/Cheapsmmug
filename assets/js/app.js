// ===============================================
// App.js - User Frontend Main Entry Point
// ===============================================

// 1. Route Guard (Must be at the very top)
const currentPath = window.location.pathname.toLowerCase();
const isPublicPage = currentPath.includes('login') ||
 currentPath.includes('register') ||
 currentPath.includes('forgot') ||
 currentPath.endsWith('/') ||
 currentPath.includes('index.html');

if (!isPublicPage) {
 const token = localStorage.getItem('smmmaria_token');
 if (!token) {
  window.location.href = 'login.html';
 }
}

// 2. Imports
import { api } from '../utils/api.js';
import { initTheme } from '../utils/storage.js';
import { initSidebar } from '../components/sidebar.js';
import { initNavbar } from '../components/navbar.js';
import { initModals } from '../components/modal.js';
import { initToasts } from '../components/toast.js';
import { initFooter } from '../components/footer.js';
import { initSidebarWidgets } from '../components/sidebar-widgets.js';
import { initDropdowns } from '../components/dropdown.js';
import { initCurrency, formatCurrency } from '../modules/currency.js'; // Added formatCurrency
import { loadPageModule } from './router.js';
import { handleLogin, handleRegister, handleLogout } from '../modules/auth.js';

// Expose Auth functions to window for HTML inline events (onsubmit/onclick)
window.handleLogin = handleLogin;
window.handleRegister = handleRegister;
window.handleLogout = handleLogout;

// Helper to update navbar balance globally
export function updateNavbarBalance(balance) {
 const balanceEl = document.querySelector('.navbar__balance .balance-amount');
 if (balanceEl) balanceEl.textContent = formatCurrency(balance);
}

// Helper to load global notifications (Navbar Badge + Page Banner)
async function loadGlobalNotifications() {
 const navBell = document.getElementById('notif-btn');
 if (!navBell) return;
 
 try {
  const res = await api.getNotifications();
  const notifications = res.data || [];
  
  // 1. Update Navbar Badge Counter
  const unreadCount = notifications.filter(n => !n.isRead).length;
  const existingBadge = navBell.querySelector('.badge');
  if (existingBadge) existingBadge.remove();
  
  if (unreadCount > 0) {
   const badge = document.createElement('span');
   badge.className = 'badge badge--notification';
   badge.textContent = unreadCount;
   badge.style.position = 'absolute';
   badge.style.top = '0px';
   badge.style.right = '0px';
   navBell.appendChild(badge);
  }
  
  // 2. Display the latest unread message in the automatic banner card
  const notifBanner = document.getElementById('global-notif-banner');
  if (notifBanner) {
   const latestUnread = notifications.find(n => !n.isRead);
   if (latestUnread) {
    document.getElementById('banner-notif-title').innerText = latestUnread.title || 'New Update';
    document.getElementById('banner-notif-message').innerText = latestUnread.message;
    notifBanner.style.display = 'block';
   } else {
    notifBanner.style.display = 'none';
   }
  }
 } catch (error) {
  console.error('Failed to load global notifications:', error);
 }
}

// Helper to update navbar balance on currency change
window.addEventListener('currencyChanged', () => {
 const token = localStorage.getItem('smmmaria_token');
 if (token && !isPublicPage) {
  api.getMe().then(response => {
   if (response.data) {
    updateNavbarBalance(response.data.balance);
   }
  }).catch(() => {});
 }
});

document.addEventListener('DOMContentLoaded', async () => {
 // Initialize Theme
 initTheme();
 
 // Initialize Global UI Components
 initSidebar();
 initNavbar();
 initModals();
 initToasts();
 initFooter();
 initSidebarWidgets();
 initDropdowns();
 initCurrency();
 
 // Fetch real user data for Navbar
 const token = localStorage.getItem('smmmaria_token');
 if (token && !isPublicPage) {
  try {
   const response = await api.getMe();
   const user = response.data;
   
   // Update Navbar Balance (FIXED: Removed hard-coded $)
   updateNavbarBalance(user.balance);
   
   // Fetch and display global notifications
   loadGlobalNotifications();
   
   // Update Navbar Profile Name & Role
   const nameEl = document.querySelector('.profile__name');
   if (nameEl) nameEl.textContent = user.username;
   
   const roleEl = document.querySelector('.profile__role');
   if (roleEl) roleEl.textContent = user.role === 'user' ? 'Standard User' : 'Premium User';
   
   // Update Avatar Initials
   const avatarEl = document.querySelector('.navbar__profile .avatar');
   if (avatarEl) avatarEl.textContent = user.username.substring(0, 2).toUpperCase();
   
  } catch (error) {
   console.error("Session expired or invalid. Please log in again.");
   handleLogout();
  }
 }
 
 // Load the specific module for the current page
 if (!isPublicPage) {
  loadPageModule();
 }
});