// ===============================================
// Helpers Utility
// DOM selection, event delegation, debounce, clipboard
// ===============================================

export const $ = (selector, scope = document) => scope.querySelector(selector);
export const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

export function on(element, event, selector, handler) {
 element.addEventListener(event, function(e) {
  const target = e.target.closest(selector);
  if (target && element.contains(target)) {
   handler.call(target, e);
  }
 });
}

export function debounce(func, wait = 300) {
 let timeout;
 return function(...args) {
  clearTimeout(timeout);
  timeout = setTimeout(() => func.apply(this, args), wait);
 };
}

export async function copyToClipboard(text) {
 try {
  await navigator.clipboard.writeText(text);
  return true;
 } catch (err) {
  console.error('Failed to copy: ', err);
  return false;
 }
}