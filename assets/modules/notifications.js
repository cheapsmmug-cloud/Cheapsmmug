// assets/modules/notifications.js

import { api } from '../utils/api.js';
import { formatDate } from '../utils/formatter.js';
import { showToast } from '../components/toast.js';

export default async function initNotificationsPage() {
 const notifList = document.getElementById('notifications-list');
 const giveawayContainer = document.getElementById('giveawayCardContainer');
 const advertContainer = document.getElementById('advertCardContainer'); // New container
 const emergencyContainer = document.getElementById('emergencyCardContainer'); // New container
 
 if (!notifList) return;
 
 try {
  const res = await api.getNotifications();
  const allNotifications = res.data || [];
  
  if (allNotifications.length === 0) {
   notifList.innerHTML = `<li class="text-muted text-center" style="padding: 40px;">No notifications found.</li>`;
   return;
  }
  
  let giveaways = [];
  let adverts = [];
  let emergencies = [];
  let regularNotifs = [];
  
  // Regex to find image URLs in the message
  const imageRegex = /(https?:\/\/[^\s]+\.(?:png|jpg|jpeg|gif|webp))/i;
  
  allNotifications.forEach(n => {
   const title = (n.title || '').toLowerCase();
   const message = (n.message || '').toLowerCase();
   
   // Check keywords
   const isEmergency = title.includes('emergency') || message.includes('emergency');
   const isAdvert = title.includes('advert') || message.includes('advertisement') || title.includes('ad');
   const isGiveaway = title.includes('giveaway') || title.includes('give away') || message.includes('giveaway') || message.includes('give away');
   
   if (isEmergency) {
    emergencies.push(n);
   } else if (isAdvert) {
    // Extract image URL if it exists in the original message
    const imgMatch = (n.message || '').match(imageRegex);
    if (imgMatch) {
     n.imageUrl = imgMatch[0];
     // Clean up the message to remove the raw URL so it doesn't show as text
     n.cleanMessage = (n.message || '').replace(imageRegex, '').trim();
    } else {
     n.cleanMessage = n.message;
    }
    adverts.push(n);
   } else if (isGiveaway) {
    giveaways.push(n);
   } else {
    regularNotifs.push(n);
   }
  });
  
  // 1. Render Emergency Card
  if (emergencyContainer) {
   if (emergencies.length > 0) {
    emergencyContainer.innerHTML = emergencies.map(e => `
                    <div class="card" style="margin-bottom: 20px; border: 2px solid var(--color-danger, #ef4444); background: linear-gradient(135deg, rgba(239, 68, 68, 0.05), var(--bg-card));">
                        <div class="card__header" style="border-bottom: none; padding-bottom: 0;">
                            <h3 class="card__title" style="display: flex; align-items: center; gap: 8px; color: var(--color-danger, #ef4444);">
                                🚨 ${e.title || 'EMERGENCY NOTICE'}
                            </h3>
                        </div>
                        <div class="card__body" style="padding-top: 10px;">
                            <p style="font-size: 15px; color: var(--text-primary); line-height: 1.6; margin-bottom: 10px;">${e.message}</p>
                            <span class="notification__time" style="font-size: 12px; color: var(--text-muted);">${formatDate(e.createdAt)}</span>
                        </div>
                    </div>
                `).join('');
    emergencyContainer.style.display = 'block';
   } else {
    emergencyContainer.style.display = 'none';
   }
  }
  
  // 2. Render Advert Card (With Image)
  if (advertContainer) {
   if (adverts.length > 0) {
    advertContainer.innerHTML = adverts.map(a => `
                    <div class="card" style="margin-bottom: 20px; border: 2px solid var(--color-primary, #3b82f6); background: linear-gradient(135deg, rgba(59, 130, 246, 0.05), var(--bg-card));">
                        <div class="card__header" style="border-bottom: none; padding-bottom: 0;">
                            <h3 class="card__title" style="display: flex; align-items: center; gap: 8px; color: var(--color-primary, #3b82f6);">
                                📢 ${a.title || 'ADVERTISEMENT'}
                            </h3>
                        </div>
                        <div class="card__body" style="padding-top: 10px;">
                            ${a.imageUrl ? `<img src="${a.imageUrl}" alt="Advertisement" style="width: 100%; max-height: 300px; object-fit: cover; border-radius: 8px; margin-bottom: 15px;">` : ''}
                            ${a.cleanMessage ? `<p style="font-size: 15px; color: var(--text-primary); line-height: 1.6; margin-bottom: 10px;">${a.cleanMessage}</p>` : ''}
                            <span class="notification__time" style="font-size: 12px; color: var(--text-muted);">${formatDate(a.createdAt)}</span>
                        </div>
                    </div>
                `).join('');
    advertContainer.style.display = 'block';
   } else {
    advertContainer.style.display = 'none';
   }
  }
  
  // 3. Render Giveaway Card
  if (giveawayContainer) {
   if (giveaways.length > 0) {
    giveawayContainer.innerHTML = giveaways.map(g => `
                    <div class="card" style="margin-bottom: 20px; border: 2px solid var(--color-gold); background: linear-gradient(135deg, rgba(244, 179, 66, 0.05), var(--bg-card));">
                        <div class="card__header" style="border-bottom: none; padding-bottom: 0;">
                            <h3 class="card__title" style="display: flex; align-items: center; gap: 8px; color: var(--color-gold);">
                                🎉 ${g.title || 'GIVE AWAY'}
                            </h3>
                        </div>
                        <div class="card__body" style="padding-top: 10px;">
                            <p style="font-size: 15px; color: var(--text-primary); line-height: 1.6; margin-bottom: 10px;">${g.message}</p>
                            <span class="notification__time" style="font-size: 12px; color: var(--text-muted);">${formatDate(g.createdAt)}</span>
                        </div>
                    </div>
                `).join('');
    giveawayContainer.style.display = 'block';
   } else {
    giveawayContainer.style.display = 'none';
   }
  }
  
  // 4. Render Regular Notifications List
  if (regularNotifs.length === 0) {
   notifList.innerHTML = `<li class="text-muted text-center" style="padding: 40px;">No other notifications found.</li>`;
   return;
  }
  
  notifList.innerHTML = regularNotifs.map(n => {
   const iconClass = n.type === 'announcement' ? 'notification__icon--warning' : 'notification__icon--info';
   const iconText = n.type === 'announcement' ? '📢' : 'i';
   
   return `
                <li class="notification-item" style="margin-bottom: 15px; border-bottom: 1px solid var(--border-color); padding-bottom: 15px;">
                    <div class="notification__icon ${iconClass}">${iconText}</div>
                    <div class="notification__content">
                        <p><strong>${n.title || 'Notification'}</strong>: ${n.message}</p>
                        <span class="notification__time">${formatDate(n.createdAt)}</span>
                    </div>
                </li>
            `;
  }).join('');
  
 } catch (error) {
  console.error('Failed to load notifications:', error);
  showToast('Failed to load notifications', 'error');
  notifList.innerHTML = `<li class="text-muted text-center text-danger">Failed to load notifications.</li>`;
 }
}