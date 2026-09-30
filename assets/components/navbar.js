// ===============================================
// Navbar Component
// Theme switcher, profile menu
// ===============================================

import { $, on } from '../utils/helpers.js';
import { toggleTheme } from '../utils/storage.js';

export function initNavbar() {
 const themeToggle = $('#theme-toggle');
 const body = document.body;
 
 if (themeToggle) {
  themeToggle.addEventListener('click', () => {
   toggleTheme();
  });
 }
 
 // Close dropdowns when clicking outside
 document.addEventListener('click', (e) => {
  // Simple placeholder for dropdown logic
 });
}