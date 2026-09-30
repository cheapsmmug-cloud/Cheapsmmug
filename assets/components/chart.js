// ===============================================
// Chart Component (Pure CSS Bar Chart)
// ===============================================
import { $ } from '../utils/helpers.js';

export function renderBarChart(containerSelector, data, maxVal) {
 const container = $(containerSelector);
 if (!container) return;
 
 container.innerHTML = data.map(val => `
        <div class="chart-bar" style="height: ${(val / maxVal) * 100}%;"></div>
    `).join('');
}