// ===============================================
// Breadcrumb Component
// ===============================================
import { $ } from '../utils/helpers.js';

export function initBreadcrumb(pageName) {
 const container = $('.breadcrumb');
 if (container) {
  container.innerHTML = `<a href="dashboard.html">Dashboard</a> / <span>${pageName}</span>`;
 }
}