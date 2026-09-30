// ===============================================
// Sidebar Component
// Collapse, Expand, Mobile Drawer
// ===============================================

import { $ } from '../utils/helpers.js';
import { storage } from '../utils/storage.js';

export function initSidebar() {
 const appContainer = $('.app-container');
 const collapseBtn = $('#collapse-btn');
 const mobileToggle = $('#mobile-menu-toggle');
 const overlay = $('#sidebar-overlay');
 
 if (!appContainer) return;
 
 // Collapse/Expand (Desktop)
 if (collapseBtn) {
  collapseBtn.addEventListener('click', () => {
   appContainer.classList.toggle('sidebar-collapsed');
   const isCollapsed = appContainer.classList.contains('sidebar-collapsed');
   storage.set('sidebar_collapsed', isCollapsed);
  });
  
  // Restore state
  if (storage.get('sidebar_collapsed')) {
   appContainer.classList.add('sidebar-collapsed');
  }
 }
 
 // Mobile Drawer
 if (mobileToggle) {
  mobileToggle.addEventListener('click', () => {
   appContainer.classList.add('sidebar-open');
   if (overlay) overlay.classList.add('active');
  });
 }
 
 if (overlay) {
  overlay.addEventListener('click', () => {
   appContainer.classList.remove('sidebar-open');
   overlay.classList.remove('active');
  });
 }
}