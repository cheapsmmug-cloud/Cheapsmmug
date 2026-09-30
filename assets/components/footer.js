// ===============================================
// Footer Component
// ===============================================
export function initFooter() {
 const footer = document.querySelector('.footer__text');
 if (footer) {
  const year = new Date().getFullYear();
  footer.textContent = `© ${year} SMMMARIA Panel. All rights reserved.`;
 }
}