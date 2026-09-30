// ===============================================
// Tickets Module
// ===============================================

import { api } from '../utils/api.js';
import { showToast } from '../components/toast.js';

let activeTicketId = null;

export default async function initTickets() {
 const ticketList = document.querySelector('.ticket-items');
 if (!ticketList) return;
 
 const newTicketBtn = document.getElementById('new-ticket-btn');
 const sendBtn = document.getElementById('send-reply-btn');
 const modal = document.getElementById('newTicketModal');
 const closeBtn = document.getElementById('closeTicketModalBtn');
 const subjectSelect = document.getElementById('ticket-subject');
 const form = document.getElementById('new-ticket-form');
 const backBtn = document.getElementById('back-to-tickets-btn');
 
 // 1. Fetch and Render Ticket List
 await loadTickets();
 
 // 2. Modal Listeners
 if (newTicketBtn) {
  newTicketBtn.addEventListener('click', () => {
   if (form) form.reset();
   updateTicketFields();
   if (modal) modal.classList.add('active');
  });
 }
 
 if (closeBtn) {
  closeBtn.addEventListener('click', () => {
   if (modal) modal.classList.remove('active');
  });
 }
 
 if (modal) {
  modal.addEventListener('click', (e) => {
   if (e.target === modal) modal.classList.remove('active');
  });
 }
 
 // 3. Conditional Fields Listener
 if (subjectSelect) {
  subjectSelect.addEventListener('change', updateTicketFields);
 }
 
 // 4. Form Submit Listener
 if (form) {
  form.addEventListener('submit', handleTicketSubmit);
 }
 
 // 5. Reply Listener
 if (sendBtn) {
  sendBtn.addEventListener('click', sendReply);
 }
 
 // 6. Mobile Back Button Listener
 if (backBtn) {
  backBtn.addEventListener('click', () => {
   const inboxLayout = document.querySelector('.inbox-layout');
   if (inboxLayout) inboxLayout.classList.remove('show-detail');
  });
 }
}

// Update conditional field visibility based on Subject
function updateTicketFields() {
 const subject = document.getElementById('ticket-subject').value;
 const orderIdGroup = document.getElementById('order-id-group');
 const requestGroup = document.getElementById('request-group');
 
 const requiresOrderId = subject === 'Order' || subject === 'Request';
 const requiresRequest = subject === 'Request';
 
 if (orderIdGroup) orderIdGroup.style.display = requiresOrderId ? 'block' : 'none';
 if (requestGroup) requestGroup.style.display = requiresRequest ? 'block' : 'none';
}

// Handle New Ticket Submission
async function handleTicketSubmit(e) {
 e.preventDefault();
 
 const subject = document.getElementById('ticket-subject').value;
 const orderIdInput = document.getElementById('ticket-order-id').value;
 const requestType = document.getElementById('ticket-request').value;
 const message = document.getElementById('ticket-message').value.trim();
 const submitBtn = document.getElementById('submit-ticket-btn');
 
 // Validation
 if (!subject) return showToast('Please select a subject.', 'error');
 
 const requiresOrderId = subject === 'Order' || subject === 'Request';
 const requiresRequest = subject === 'Request';
 
 let orderId = null;
 if (requiresOrderId) {
  if (!orderIdInput.trim()) return showToast('Please enter an order ID.', 'error');
  // Normalize Order IDs
  orderId = orderIdInput.split(',').map(id => id.trim()).filter(Boolean).join(',');
  if (!orderId) return showToast('Invalid Order ID format.', 'error');
 }
 
 if (requiresRequest && !requestType) {
  return showToast('Please select a request type.', 'error');
 }
 
 if (!message) return showToast('Please enter a message.', 'error');
 
 // Build Payload
 const payload = {
  subject,
  orderId: orderId,
  requestType: requiresRequest ? requestType : null,
  message,
  priority: 'medium'
 };
 
 // Loading state
 if (submitBtn) {
  submitBtn.disabled = true;
  submitBtn.textContent = 'Submitting...';
 }
 
 try {
  await api.createTicket(payload);
  showToast('Ticket created successfully!', 'success');
  const modal = document.getElementById('newTicketModal');
  if (modal) modal.classList.remove('active');
  if (e.target) e.target.reset();
  updateTicketFields();
  await loadTickets(); // Refresh list
 } catch (error) {
  showToast(error.message || 'Failed to create ticket. Please try again.', 'error');
 } finally {
  if (submitBtn) {
   submitBtn.disabled = false;
   submitBtn.textContent = 'Submit ticket';
  }
 }
}

// Load and Render Ticket List
async function loadTickets() {
 const ticketList = document.querySelector('.ticket-items');
 if (!ticketList) {
  console.error("Could not find the .ticket-items div in the HTML!");
  return;
 }
 
 // Let us know the JS is running
 ticketList.innerHTML = `<p class="text-center text-muted">Loading tickets...</p>`;
 
 try {
  // Try to call the API
  const response = await api.getTickets();
  
  // Check what the backend gave us
  if (!response || !response.data) {
   ticketList.innerHTML = `<p class="text-danger">Backend returned no data. Response was: ${JSON.stringify(response)}</p>`;
   return;
  }
  
  const tickets = response.data;
  
  if (tickets.length === 0) {
   ticketList.innerHTML = `<p class="text-center text-muted">No tickets found. Click + New to create one.</p>`;
  } else {
   ticketList.innerHTML = tickets.map(ticket => {
    const metaHtml = [];
    if (ticket.orderId) metaHtml.push(`<span style="font-size: 12px; color: var(--text-secondary); display: block; margin-top: 2px;">Order ID: ${ticket.orderId}</span>`);
    if (ticket.requestType) metaHtml.push(`<span style="font-size: 12px; color: var(--text-secondary); display: block;">Request: ${ticket.requestType}</span>`);
    
    return `
        <div class="ticket-item" data-ticket-id="${ticket.id}">
            <div class="ticket-item__top">
                <span class="ticket-item__name">${ticket.subject}</span>
                <span class="ticket-item__time">${ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString() : ''}</span>
            </div>
            ${metaHtml.length ? `<div style="margin-bottom: 5px;">${metaHtml.join('')}</div>` : ''}
            <p class="ticket-item__msg">Status: ${ticket.status}</p>
            <span class="badge badge--${ticket.priority === 'high' ? 'danger' : 'warning'}">${ticket.priority}</span>
        </div>
      `;
   }).join('');
   
   // Attach event listeners to the newly rendered tickets
   document.querySelectorAll('.ticket-item').forEach(item => {
    item.addEventListener('click', (e) => {
     const id = e.currentTarget.getAttribute('data-ticket-id');
     loadTicket(e, id);
    });
   });
  }
 } catch (error) {
  // If it crashes, print the exact error on the screen
  ticketList.innerHTML = `<p class="text-danger">Error: ${error.message}</p>`;
 }
}

// Load Specific Ticket Thread
async function loadTicket(event, ticketId) {
 activeTicketId = ticketId;
 
 // Safely handle the event to highlight the active ticket
 const items = document.querySelectorAll('.ticket-item');
 items.forEach(item => item.classList.remove('active'));
 if (event && event.currentTarget) {
  event.currentTarget.classList.add('active');
 }
 
 // Show chat view on mobile
 const inboxLayout = document.querySelector('.inbox-layout');
 if (inboxLayout) inboxLayout.classList.add('show-detail');
 
 const chatHeader = document.getElementById('chat-title');
 const chatBody = document.getElementById('chat-body');
 const chatFooter = document.getElementById('chat-footer');
 
 if (chatHeader) chatHeader.textContent = `Loading Ticket #${ticketId}...`;
 if (chatBody) chatBody.innerHTML = '';
 if (chatFooter) chatFooter.style.display = 'none';
 
 try {
  const response = await api.getTicketById(ticketId);
  const data = response.data || response;
  
  const ticket = data.ticket || data;
  const messages = data.messages || ticket.messages || [];
  
  if (chatHeader && ticket) {
   chatHeader.textContent = `${ticket.subject} ${ticket.requestType ? '— ' + ticket.requestType : ''}`;
  }
  
  if (chatBody && ticket) {
   let metaHtml = '<div style="margin-bottom: 15px; font-size: 12px; color: var(--text-secondary); border-bottom: 1px solid var(--border-color); padding-bottom: 10px;">';
   if (ticket.orderId) metaHtml += `Order ID: ${ticket.orderId}<br>`;
   metaHtml += `Status: <span class="badge badge--${ticket.status === 'open' ? 'success' : 'muted'}">${ticket.status}</span><br>`;
   metaHtml += `Priority: ${ticket.priority || 'Medium'}`;
   metaHtml += '</div>';
   
   if (messages.length === 0) {
    chatBody.innerHTML = metaHtml + `<p class="text-muted">No messages yet. Send a reply below.</p>`;
   } else {
    chatBody.innerHTML = metaHtml + messages.map(msg => `
          <div class="chat-message ${msg.isAdmin ? 'chat-message--left' : 'chat-message--right'}">
            <div class="avatar">${msg.isAdmin ? 'AD' : 'ME'}</div>
            <div class="chat-content">${msg.message}</div>
          </div>
        `).join('');
    chatBody.scrollTop = chatBody.scrollHeight;
   }
  }
  
  if (chatFooter && ticket.status === 'open') {
   chatFooter.style.display = 'flex';
  }
 } catch (error) {
  showToast('Failed to load ticket details', 'error');
  console.error("Ticket Detail Error:", error);
 }
}

// Send Reply Function
async function sendReply() {
 if (!activeTicketId) return showToast('Please select a ticket first', 'error');
 
 const textarea = document.getElementById('reply-input');
 if (!textarea) return;
 
 const message = textarea.value.trim();
 if (!message) return showToast('Please type a message first', 'error');
 
 const sendBtn = document.getElementById('send-reply-btn');
 if (sendBtn) {
  sendBtn.disabled = true;
  sendBtn.textContent = 'Sending...';
 }
 
 try {
  await api.replyTicket(activeTicketId, message);
  showToast('Reply sent successfully!', 'success');
  textarea.value = '';
  loadTicket(null, activeTicketId);
 } catch (error) {
  showToast(error.message || 'Failed to send reply', 'error');
 } finally {
  if (sendBtn) {
   sendBtn.disabled = false;
   sendBtn.textContent = 'Send';
  }
 }
}