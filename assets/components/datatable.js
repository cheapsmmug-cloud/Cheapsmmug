// ===============================================
// Datatable Component (Generic Renderer)
// ===============================================
import { $ } from '../utils/helpers.js';

export function renderTable(tbodySelector, data, rowTemplate) {
 const tbody = $(tbodySelector);
 if (!tbody) return;
 
 if (!data || data.length === 0) {
  tbody.innerHTML = `<tr><td colspan="100%" class="text-center text-muted">No data found.</td></tr>`;
  return;
 }
 
 tbody.innerHTML = data.map(item => rowTemplate(item)).join('');
}