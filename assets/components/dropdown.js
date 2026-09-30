// ===============================================
// Dropdown Component (Profile, Language)
// ===============================================
export function initDropdowns() {
 document.addEventListener('click', (e) => {
  const toggles = document.querySelectorAll('[data-dropdown-toggle]');
  
  toggles.forEach(toggle => {
   const menuId = toggle.getAttribute('data-dropdown-toggle');
   const menu = document.getElementById(menuId);
   
   if (toggle.contains(e.target)) {
    if (menu) menu.classList.toggle('active');
   } else {
    if (menu) menu.classList.remove('active');
   }
  });
 });
}