// ===============================================
// Pagination Component
// ===============================================
import { $ } from '../utils/helpers.js';

export function renderPagination(containerSelector, currentPage, totalPages, onClick) {
 const container = $(containerSelector);
 if (!container) return;
 
 container.innerHTML = '';
 
 const prevBtn = document.createElement('button');
 prevBtn.className = 'btn btn--outline btn--sm';
 prevBtn.textContent = 'Prev';
 prevBtn.disabled = currentPage === 1;
 prevBtn.onclick = () => onClick(currentPage - 1);
 container.appendChild(prevBtn);
 
 for (let i = 1; i <= totalPages; i++) {
  const btn = document.createElement('button');
  btn.className = `btn ${i === currentPage ? 'btn--primary' : 'btn--outline'} btn--sm`;
  btn.textContent = i;
  btn.onclick = () => onClick(i);
  container.appendChild(btn);
 }
 
 const nextBtn = document.createElement('button');
 nextBtn.className = 'btn btn--outline btn--sm';
 nextBtn.textContent = 'Next';
 nextBtn.disabled = currentPage === totalPages;
 nextBtn.onclick = () => onClick(currentPage + 1);
 container.appendChild(nextBtn);
}