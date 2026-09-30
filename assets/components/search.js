// ===============================================
// Search Component (Debounced)
// ===============================================
import { $, debounce } from '../utils/helpers.js';

export function initSearch(inputSelector, tableSelector) {
 const input = $(inputSelector);
 const table = $(tableSelector);
 if (!input || !table) return;
 
 input.addEventListener('input', debounce((e) => {
  const term = e.target.value.toLowerCase();
  const rows = table.querySelectorAll('tbody tr');
  
  rows.forEach(row => {
   const text = row.textContent.toLowerCase();
   row.style.display = text.includes(term) ? '' : 'none';
  });
 }, 300));
}