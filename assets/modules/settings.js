// ===============================================
// Settings Module
// ===============================================

import { api } from '../utils/api.js';
import { $ } from '../utils/helpers.js';
import { formatDate } from '../utils/formatter.js';
import { showToast } from '../components/toast.js';

export default async function initSettings() {
 const profileForm = $('#profile-form');
 let userData = null;
 
 // 1. Fetch real user data
 try {
  const meRes = await api.getMe();
  userData = meRes.data;
  
  if (userData) {
   // --- Populate Profile Tab ---
   if ($('#settings-fullname')) $('#settings-fullname').value = userData.fullname || userData.username || '';
   if ($('#settings-username')) $('#settings-username').value = userData.username || '';
   if ($('#settings-country')) $('#settings-country').value = userData.country || '';
   if ($('#settings-phone')) $('#settings-phone').value = userData.phone || '';
   
   // --- Populate Security Tab ---
   if ($('#settings-account-id')) $('#settings-account-id').value = userData.accountId || 'N/A';
   if ($('#settings-email')) $('#settings-email').value = userData.email || 'N/A';
   if ($('#settings-security-phone')) $('#settings-security-phone').value = userData.phone || 'N/A';
   if ($('#settings-referral-code')) $('#settings-referral-code').value = userData.referralCode || 'N/A';
   
   // --- Update Avatar Initials ---
   const avatarEl = $('#settings-avatar');
   if (avatarEl && userData.username) {
    avatarEl.textContent = userData.username.substring(0, 2).toUpperCase();
   }
  }
 } catch (error) {
  showToast('Failed to load profile data', 'error');
 }
 
 // 2. Handle Form Submit (Update Profile)
 if (profileForm) {
  profileForm.addEventListener('submit', async (e) => {
   e.preventDefault();
   
   const fullname = $('#settings-fullname').value;
   const username = $('#settings-username').value;
   const country = $('#settings-country').value;
   const phone = $('#settings-phone').value;
   
   try {
    showToast('Saving changes...', 'info');
    // Call the real backend API to update profile
    await api.updateProfile({ fullname, username, country, phone });
    showToast('Profile updated successfully!', 'success');
   } catch (error) {
    showToast(error.message || 'Failed to update profile', 'error');
   }
  });
 }
 
 // 3. Handle Account Deletion
 const deleteBtn = document.getElementById('deleteAccountBtn');
 if (deleteBtn) {
  deleteBtn.addEventListener('click', async () => {
   if (!confirm('Are you absolutely sure? This action CANNOT be undone. Type OK to confirm.')) return;
   
   if (prompt('Please type your password to confirm deletion:') === null) return;
   
   try {
    showToast('Deleting account...', 'info');
    await api.deleteAccount();
    showToast('Account deleted successfully. Redirecting...', 'success');
    
    // Clear local storage and redirect to login
    localStorage.removeItem('smmmaria_token');
    setTimeout(() => {
     window.location.href = 'login.html';
    }, 2000);
   } catch (error) {
    showToast(error.message || 'Failed to delete account. Please contact support.', 'error');
   }
  });
 }
 
 // Note: Tab switching logic is already handled by the inline script in settings.html
}