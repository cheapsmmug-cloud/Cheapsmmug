// ===============================================
// Loader & Skeleton Component
// ===============================================
export function showLoader(container) {
 if (container) {
  container.innerHTML = `<div class="skeleton-loader" style="height: 100%; width: 100%;"></div>`;
 }
}

export function hideLoader(container) {
 if (container) {
  container.innerHTML = '';
 }
}