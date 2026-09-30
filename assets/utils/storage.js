// ===============================================
// Storage Utility
// LocalStorage, SessionStorage, and Theme Management
// ===============================================

const THEME_KEY = 'smmmaria_theme';

export const storage = {
 get: (key) => JSON.parse(localStorage.getItem(key)),
 set: (key, value) => localStorage.setItem(key, JSON.stringify(value)),
 remove: (key) => localStorage.removeItem(key),
 
 getSession: (key) => JSON.parse(sessionStorage.getItem(key)),
 setSession: (key, value) => sessionStorage.setItem(key, JSON.stringify(value)),
};

export function initTheme() {
 const savedTheme = storage.get(THEME_KEY) || 'light';
 document.documentElement.setAttribute('data-theme', savedTheme);
}

export function toggleTheme() {
 const currentTheme = document.documentElement.getAttribute('data-theme');
 const newTheme = currentTheme === 'light' ? 'dark' : 'light';
 document.documentElement.setAttribute('data-theme', newTheme);
 storage.set(THEME_KEY, newTheme);
}