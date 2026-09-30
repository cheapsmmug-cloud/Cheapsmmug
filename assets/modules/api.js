// ===============================================
// API Documentation Module
// ===============================================

import { api } from '../utils/api.js';
import { $, $$, copyToClipboard } from '../utils/helpers.js';
import { showToast } from '../components/toast.js';

export default async function initApi() {
 const copyBtn = document.querySelector('.api-key-display .btn');
 const apiKeyInput = $('#apiKey');
 const tabs = $$('.api-code-card .tab');
 const codeBlock = $('.code-block code');
 
 let apiKey = 'Your API key will appear here';
 const backendUrl = 'https://smmmaria-backend-production.up.railway.app/api/v1';
 
 // 1. Function to render the correct code based on the active tab
 const renderCodeSnippet = () => {
  if (!codeBlock) return;
  
  // Find the currently active tab
  const activeTab = document.querySelector('.api-code-card .tab.active');
  const tabName = activeTab ? activeTab.textContent.trim() : 'PHP';
  
  const codeSnippets = {
   'PHP': `<?php\n$apiKey = '${apiKey}';\n$endpoint = '${backendUrl}/orders';\n\n$ch = curl_init($endpoint);\ncurl_setopt($ch, CURLOPT_RETURNTRANSFER, true);\ncurl_setopt($ch, CURLOPT_HTTPHEADER, [\n    'Authorization: Bearer ' . $apiKey,\n    'Content-Type: application/json'\n]);\n$response = curl_exec($ch);\n?>`,
   'Python': `import requests\n\napi_key = '${apiKey}'\nendpoint = '${backendUrl}/orders'\n\nheaders = {\n    'Authorization': f'Bearer {api_key}',\n    'Content-Type': 'application/json'\n}\n\nresponse = requests.get(endpoint, headers=headers)\nprint(response.json())`,
   'Node.js': `const axios = require('axios');\n\nconst apiKey = '${apiKey}';\nconst endpoint = '${backendUrl}/orders';\n\naxios.get(endpoint, {\n    headers: {\n        'Authorization': \`Bearer \${apiKey}\`,\n        'Content-Type': 'application/json'\n    }\n})\n.then(res => console.log(res.data))\n.catch(err => console.error(err));`
  };
  
  codeBlock.textContent = codeSnippets[tabName] || 'Code example not available.';
 };
 
 // 2. Setup Tab Listeners (Bind ONLY ONCE on page load)
 if (tabs.length > 0) {
  tabs.forEach(tab => {
   tab.addEventListener('click', () => {
    tabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    renderCodeSnippet(); // Just re-render the text, don't rebind listeners
   });
  });
 }
 
 // 3. Fetch Real API Key from Backend
 try {
  const response = await api.getMe();
  apiKey = response.data?.apiKey || 'No API Key Found';
  if (apiKeyInput) apiKeyInput.value = apiKey;
  renderCodeSnippet(); // Render initial snippet with real key
 } catch (error) {
  showToast('Failed to load API key', 'error');
  console.error('API Key Load Error:', error);
 }
 
 // 4. Copy API Key Button
 if (copyBtn && apiKeyInput) {
  copyBtn.addEventListener('click', async () => {
   const success = await copyToClipboard(apiKeyInput.value);
   if (success) showToast('API Key copied to clipboard!', 'success');
  });
 }
 
 // 5. Handle Generate & Reset Buttons
 const generateBtn = document.querySelector('.api-key-card .btn--outline');
 const resetBtn = document.querySelector('.api-key-card .btn--danger');
 
 const handleKeyChange = async (action) => {
  if (!window.confirm(`Are you sure you want to ${action} your API key? Any existing integrations will break.`)) return;
  
  try {
   showToast(`${action === 'generate' ? 'Generating' : 'Resetting'} API key...`, 'info');
   
   const response = await api.regenerateApiKey();
   
   // Safely extract the new API key from the response
   apiKey = response.data?.apiKey || response.apiKey || 'Error retrieving key';
   
   if (apiKeyInput) apiKeyInput.value = apiKey;
   renderCodeSnippet(); // Update code block with the new key
   
   showToast(`API Key ${action}d successfully!`, 'success');
  } catch (error) {
   console.error('API Key Change Error:', error);
   showToast(error.message || `Failed to ${action} API key`, 'error');
  }
 };
 
 if (generateBtn) {
  generateBtn.addEventListener('click', () => handleKeyChange('generate'));
 }
 if (resetBtn) {
  resetBtn.addEventListener('click', () => handleKeyChange('reset'));
 }
}