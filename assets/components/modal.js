// ===============================================
// Modal Component
// Global modal system using data-modal-target
// ===============================================

import { $, $$, on } from '../utils/helpers.js';

export function initModals() {
 const body = document.body;
 
 // Open modal on click
 on(body, 'click', '[data-modal-target]', (e) => {
  const trigger = e.target.closest('[data-modal-target]');
  if (!trigger) return;
  
  const targetId = trigger.getAttribute('data-modal-target');
  const modal = $(targetId);
  if (modal) {
   modal.classList.add('active');
   body.style.overflow = 'hidden';
  }
 });
 
 // Close modal on overlay click or close button
 on(body, 'click', '.modal-overlay', (e) => {
  const modal = e.target.closest('.modal-overlay');
  if (!modal) return;
  
  // If user clicked directly on the overlay background OR a close button inside it
  if (e.target === modal || e.target.closest('[data-modal-close]')) {
   modal.classList.remove('active');
   body.style.overflow = '';
  }
 });
 
 // Close on Escape key
 document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
   $$('.modal-overlay.active').forEach(modal => {
    modal.classList.remove('active');
    body.style.overflow = '';
   });
  }
 });
}