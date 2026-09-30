// ===============================================
// Validators Utility
// Form validation helpers
// ===============================================

export const isRequired = (value) => value.trim() !== '' || 'This field is required';
export const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) || 'Invalid email address';
export const isUrl = (value) => {
 try {
  new URL(value);
  return true;
 } catch {
  return 'Invalid URL format';
 }
};
export const minLength = (value, len) => value.length >= len || `Must be at least ${len} characters`;

export function validateForm(formElement, rules) {
 let isValid = true;
 const errors = {};
 
 Object.keys(rules).forEach(fieldName => {
  const input = formElement.querySelector(`[name="${fieldName}"]`);
  if (!input) return;
  
  const value = input.value;
  const rule = rules[fieldName];
  const result = rule(value);
  
  if (result !== true) {
   isValid = false;
   errors[fieldName] = result;
   input.classList.add('input-error');
  } else {
   input.classList.remove('input-error');
  }
 });
 
 return { isValid, errors };
}