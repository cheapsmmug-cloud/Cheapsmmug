// ===============================================
// Formatter Utility
// Currency, Date, and Number formatting
// ===============================================

// Delegate currency formatting to the central currency module.
// This ensures ALL modules using this utility respect the selected currency.
import { formatCurrency as _formatCurrency } from '../modules/currency.js';

export const formatCurrency = _formatCurrency;

export function formatDate(dateString) {
 const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
 return new Date(dateString).toLocaleDateString('en-US', options);
}

export function formatNumber(num) {
 return new Intl.NumberFormat('en-US').format(num);
}