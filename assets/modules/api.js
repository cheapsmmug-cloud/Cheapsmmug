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
  // FIX: Updated to the standard Provider V2 API URL
  const backendUrl = 'https://smmaria.site/api/v2';
  
  // 1. Function to render the correct code based on the active tab
  const renderCodeSnippet = () => {
    if (!codeBlock) return;
    
    // Find the currently active tab
    const activeTab = document.querySelector('.api-code-card .tab.active');
    const tabName = activeTab ? activeTab.textContent.trim() : 'PHP';
    
    // FIX: Updated examples to match the standard SMM API (key & action in body)
    const codeSnippets = {
      'PHP': `<?php\n$apiKey = '${apiKey}';\n$endpoint = '${backendUrl}';\n\n$ch = curl_init($endpoint);\ncurl_setopt($ch, CURLOPT_RETURNTRANSFER, true);\ncurl_setopt($ch, CURLOPT_POST, true);\ncurl_setopt($ch, CURLOPT_POSTFIELDS, [\n    'key' => $apiKey,\n    'action' => 'services'\n]);\n$response = curl_exec($ch);\n?>`,
      'Python': `import requests\n\napi_key = '${apiKey}'\nendpoint = '${backendUrl}'\n\ndata = {\n    'key': api_key,\n    'action': 'balance'\n}\n\nresponse = requests.post(endpoint, data=data)\nprint(response.json())`,
      'Node.js': `const axios = require('axios');\n\nconst apiKey = '${apiKey}';\nconst endpoint = '${backendUrl}';\n\naxios.post(endpoint, new URLSearchParams({\n    key: apiKey,\n    action: 'add',\n    service: 1,\n    link: 'https://example.com',\n    quantity: 1000\n}))\n.then(res => console.log(res.data))\n.catch(err => console.error(err));`
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
