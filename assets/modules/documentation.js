// ===============================================
// Documentation Module
// ===============================================

import { api } from '../utils/api.js';
import { formatDate } from '../utils/formatter.js';

export default async function initDocumentation() {
 const banner = document.getElementById('doc-announcement-banner');
 const textEl = document.getElementById('doc-announce-text');
 const dateEl = document.getElementById('doc-announce-date');
 
 if (!banner || !textEl || !dateEl) return;
 
 try {
  // Fetch notifications/announcements
  const response = await api.getNotifications();
  const notifications = response.data || [];
  
  if (notifications.length > 0) {
   // Get the most recent announcement
   const latest = notifications[0];
   
   textEl.innerHTML = `<strong>${latest.title || 'Announcement'}:</strong> ${latest.message}`;
   dateEl.textContent = formatDate(latest.createdAt);
   
   // Show the banner
   banner.style.display = 'flex';
  }
 } catch (error) {
  console.warn('Could not load announcements for documentation page:', error.message);
  // Keep banner hidden on error
 }
}