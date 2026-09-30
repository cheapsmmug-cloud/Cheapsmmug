// ===============================================
// Auth Module (Login, Register, Logout, Google)
// ===============================================

import { api } from '../utils/api.js';
import { showToast } from '../components/toast.js';

export async function handleLogin(e) {
 e.preventDefault();
 const identifier = document.getElementById('identifier').value;
 const password = document.getElementById('password').value;
 
 if (!identifier) {
  return showToast('Please enter your email, username, or Account ID', 'error');
 }
 
 try {
  showToast('Logging in...', 'info');
  // Send identifier instead of email
  const response = await api.login(identifier, password);
  
  // Save token to localStorage
  localStorage.setItem('smmmaria_token', response.data.token);
  
  showToast('Login successful! Redirecting...', 'success');
  
  // Redirect to dashboard
  setTimeout(() => {
   window.location.href = 'services.html';
  }, 1000);
 } catch (error) {
  showToast(error.message || 'Invalid credentials', 'error');
 }
}

export async function handleRegister(e) {
 e.preventDefault();
 const fullname = document.getElementById('fullname').value;
 const email = document.getElementById('email').value;
 const username = document.getElementById('username').value;
 const country = document.getElementById('country').value;
 const phone = document.getElementById('phone').value;
 const password = document.getElementById('password').value;
 
 try {
  showToast('Creating account...', 'info');
  // Send all new fields to the API
  const response = await api.register({ fullname, username, email, password, country, phone });
  
  // Save token to localStorage
  localStorage.setItem('smmmaria_token', response.data.token);
  
  showToast('Registration successful! Redirecting...', 'success');
  
  setTimeout(() => {
   window.location.href = 'services.html';
  }, 1000);
 } catch (error) {
  showToast(error.message || 'Registration failed', 'error');
 }
}

export function handleLogout() {
 localStorage.removeItem('smmmaria_token');
 showToast('Logged out successfully', 'info');
 setTimeout(() => {
  window.location.href = 'login.html';
 }, 500);
}

// ===============================================
// Google Authentication Logic (OAuth 2.0 Popup Flow)
// ===============================================
let codeClient = null;
let isAuthenticating = false;

function initGoogleAuth() {
 const googleBtn = document.getElementById('google-login-btn');
 if (!googleBtn) return;
 
 // Helper to initialize the client
 const initializeClient = () => {
  if (window.google && window.google.accounts && window.google.accounts.oauth2) {
   codeClient = window.google.accounts.oauth2.initCodeClient({
    client_id: '354475709339-2g48o0nrugv0f1kg9n4nbn798c9upaud.apps.googleusercontent.com',
    scope: 'https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email openid',
    ux_mode: 'popup',
    callback: async (response) => {
     isAuthenticating = false;
     googleBtn.disabled = false;
     
     if (response.error) {
      if (response.error === 'popup_closed_by_user') {
       return showToast('Google sign-in cancelled.', 'info');
      }
      return showToast(`Google login failed: ${response.error}`, 'error');
     }
     
     if (!response.code) {
      return showToast('Failed to obtain Google authorization code.', 'error');
     }
     
     try {
      showToast('Verifying Google account...', 'info');
      const res = await api.googleAuth(response.code);
      
      if (res.data && res.data.token) {
       localStorage.setItem('smmmaria_token', res.data.token);
       showToast('Login successful! Redirecting...', 'success');
       setTimeout(() => {
        window.location.href = 'services.html';
       }, 1000);
      } else {
       throw new Error('Invalid response from server');
      }
     } catch (error) {
      showToast(error.message || 'Backend authentication failed', 'error');
     }
    }
   });
   return true;
  }
  return false;
 };
 
 // Try to initialize immediately
 if (!initializeClient()) {
  // If it fails, wait for the window to fully load, then try again
  window.addEventListener('load', initializeClient);
 }
 
 // 3. When the user clicks "Continue with Google", open the popup
 googleBtn.addEventListener('click', () => {
  // If client isn't ready yet, try to initialize it one last time
  if (!codeClient) {
   if (!initializeClient()) {
    return showToast('Google services are still loading. Please try again in a moment.', 'error');
   }
  }
  
  if (isAuthenticating) return;
  isAuthenticating = true;
  googleBtn.disabled = true;
  
  try {
   codeClient.requestCode();
  } catch (error) {
   isAuthenticating = false;
   googleBtn.disabled = false;
   showToast('Failed to open Google popup. Please check your popup blocker.', 'error');
  }
 });
}

// Initialize Google button listener
initGoogleAuth();


// Expose functions to the global window object so inline HTML onsubmit attributes can access them
window.handleLogin = handleLogin;
window.handleRegister = handleRegister;
window.handleLogout = handleLogout;