// assets/modules/live-chat.js

import { api } from '../utils/api.js';
import { showToast } from '../components/toast.js';

let activeChat = 'private';
let replyingTo = null;
let editingMessageId = null;
let messages = [];
let isSending = false;
let pollInterval = null;

// --- NEW: State management to prevent race conditions and overlapping polls ---
let isFetching = false;
let activeRequestId = 0;
let currentUserId = null;

// DOM Elements
let chatMessagesEl, messageInputEl, sendBtnEl, replyPreviewEl, replyPreviewUserEl, replyPreviewMessageEl, cancelReplyBtnEl;

export default async function initLiveChat() {
    console.log('[Live Chat] Initializing chat module...');
    
    try {
        chatMessagesEl = document.getElementById('chatMessages');
        messageInputEl = document.getElementById('messageInput');
        sendBtnEl = document.getElementById('sendBtn');
        replyPreviewEl = document.getElementById('replyPreview');
        replyPreviewUserEl = document.getElementById('replyPreviewUser');
        replyPreviewMessageEl = document.getElementById('replyPreviewMessage');
        cancelReplyBtnEl = document.getElementById('cancelReplyBtn');

        if (!chatMessagesEl) {
            console.error('[Live Chat] CRITICAL: Could not find #chatMessages element!');
            return;
        }

        // 1. Attach listeners IMMEDIATELY so UI is interactive regardless of API status
        document.querySelectorAll('.chat-tab').forEach(tab => {
            tab.addEventListener('click', () => switchTab(tab.getAttribute('data-chat')));
        });

        if (sendBtnEl) sendBtnEl.addEventListener('click', handleSend);
        if (messageInputEl) {
            messageInputEl.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') handleSend();
            });
        }
        if (cancelReplyBtnEl) cancelReplyBtnEl.addEventListener('click', cancelReply);

        // Fetch current user ID in the background for strict ownership checking
        api.getMe().then(res => {
            if (res.data && res.data.id) currentUserId = res.data.id;
        }).catch(err => console.warn('[Live Chat] Could not fetch user ID'));

        console.log('[Live Chat] UI is now interactive. Fetching messages in background...');
        
        // 2. Start polling
        startPolling();
        
        // 3. Trigger initial load. DO NOT AWAIT THIS. Let it run in the background.
        loadMessages(); 
        
    } catch (err) {
        console.error('[Live Chat] Initialization failed:', err);
    }
}

function switchTab(chatType) {
    activeChat = chatType;
    replyingTo = null;
    editingMessageId = null;
    if (replyPreviewEl) replyPreviewEl.style.display = 'none';
    
    document.querySelectorAll('.chat-tab').forEach(tab => {
        tab.classList.toggle('active', tab.getAttribute('data-chat') === chatType);
    });
    
    // Clear messages immediately and force a fresh load for the new tab
    messages = []; 
    loadMessages(); 
}

function startPolling() {
    if (pollInterval) clearInterval(pollInterval);
    pollInterval = setInterval(() => {
        loadMessages();
    }, 4000); 
}

async function loadMessages() {
    // Prevent overlapping requests
    if (isFetching) {
        console.log('[Live Chat] Skipping poll, previous request still running.');
        return;
    }
    
    isFetching = true;
    const reqId = ++activeRequestId; // Assign a unique ID to this request
    const chatType = activeChat; // Lock in the chat type for this specific request

    // Only show loading text if the screen is currently empty
    if (messages.length === 0 && chatMessagesEl) {
        chatMessagesEl.innerHTML = `<div class="chat-loader">Loading messages...</div>`;
    }

    try {
        const res = chatType === 'private' ? await api.getPrivateChat() : await api.getPublicChat();
        
        // Race condition check: Did the user switch tabs while we were fetching?
        if (reqId !== activeRequestId || chatType !== activeChat) {
            console.log(`[Live Chat] Discarding stale response for ${chatType} chat.`);
            return; 
        }

        const newMessages = res.data || [];
        
        // Re-render if changes detected
        if (newMessages.length !== messages.length || (newMessages.length > 0 && messages.length > 0 && newMessages[newMessages.length-1].id !== messages[messages.length-1].id)) {
            messages = newMessages;
            renderMessages();
        } else if (newMessages.length === 0 && messages.length !== 0) {
            messages = [];
            renderMessages();
        }
    } catch (error) {
        console.error(`[Live Chat] Failed to load ${chatType} messages:`, error.message);
        
        // Only show error if the screen is currently blank, otherwise keep old messages
        if (reqId === activeRequestId && chatType === activeChat && messages.length === 0) {
            chatMessagesEl.innerHTML = `<div class="chat-empty" style="color: var(--text-danger);">Unable to load messages.<br><small>${error.message}</small><br><button onclick="location.reload()" class="btn btn--sm btn--outline" style="margin-top:10px;">Retry</button></div>`;
        }
    } finally {
        isFetching = false;
    }
}

function renderMessages() {
    if (!chatMessagesEl) return;
    chatMessagesEl.innerHTML = '';
    
    if (messages.length === 0) {
        chatMessagesEl.innerHTML = activeChat === 'private' 
            ? `<div class="chat-empty">No private messages yet.<br>Send a message to customer support to start a conversation.</div>`
            : `<div class="chat-empty">No public messages yet.<br>Be the first to say hello! 👋</div>`;
        return;
    }

    messages.forEach(msg => {
        chatMessagesEl.appendChild(createMessageElement(msg));
    });

    // Auto scroll to bottom
    chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
}

function createMessageElement(msg) {
    const wrapper = document.createElement('div');
    wrapper.className = 'message-wrapper';
    wrapper.setAttribute('data-id', msg.id);
    
    // --- FIX: Robust Ownership Logic ---
    // Use actual ID if available, fallback to role check ONLY if we couldn't get ID
    const isOwn = currentUserId 
        ? (msg.userId === currentUserId || msg.senderId === currentUserId) 
        : (msg.senderRole === 'user' && activeChat === 'private'); 
        
    if (isOwn) wrapper.classList.add('own');

    // Info (Username + Timestamp)
    const info = document.createElement('div');
    info.className = 'message-info';
    
    const username = document.createElement('span');
    username.className = 'message-username';
    username.textContent = isOwn ? 'You' : (msg.username || 'User');
    info.appendChild(username);

    const time = document.createElement('span');
    time.textContent = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    info.appendChild(time);

    if (msg.edited) {
        const edited = document.createElement('span');
        edited.textContent = '· Edited';
        edited.style.fontStyle = 'italic';
        info.appendChild(edited);
    }

    wrapper.appendChild(info);

    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';

    // --- FIX: Robust Reply Handling ---
    let replyData = null;
    if (msg.replyTo && typeof msg.replyTo === 'object') {
        replyData = msg.replyTo; // Backend already attached the object
    } else if (msg.replyToId && messages.length > 0) {
        // Backend only sent the ID, let's find it in our local array
        const original = messages.find(m => m.id === msg.replyToId);
        if (original) {
            replyData = { messageId: original.id, username: original.username, message: original.message };
        }
    }

    if (replyData) {
        const replyDiv = document.createElement('div');
        replyDiv.className = 'message-reply-preview';
        
        const replyUser = document.createElement('strong');
        replyUser.textContent = replyData.username || 'User';
        replyDiv.appendChild(replyUser);
        
        const replyText = document.createElement('span');
        replyText.textContent = replyData.message || '';
        replyDiv.appendChild(replyText);
        
        replyDiv.addEventListener('click', () => {
            const originalMsg = chatMessagesEl.querySelector(`[data-id="${replyData.messageId}"]`);
            if (originalMsg) {
                originalMsg.scrollIntoView({ behavior: 'smooth', block: 'center' });
                originalMsg.style.transition = 'background-color 0.5s';
                originalMsg.style.backgroundColor = 'rgba(244, 179, 66, 0.2)';
                setTimeout(() => originalMsg.style.backgroundColor = '', 1000);
            }
        });
        bubble.appendChild(replyDiv);
    }

    // Message Content (Safe DOM API)
    if (msg.deleted) {
        const deletedText = document.createElement('span');
        deletedText.textContent = 'Message deleted';
        deletedText.style.fontStyle = 'italic';
        deletedText.style.opacity = '0.7';
        bubble.appendChild(deletedText);
    } else {
        const text = document.createElement('div');
        text.className = 'message-text';
        text.textContent = msg.message; // SECURE: textContent prevents XSS
        bubble.appendChild(text);

        if (msg.media && msg.media.url) {
            appendMedia(bubble, msg.media);
        } else {
            detectAndAppendMedia(bubble, msg.message);
        }
    }

    wrapper.appendChild(bubble);

    // Actions (Reply, Edit, Delete)
    if (!msg.deleted) {
        const actions = document.createElement('div');
        actions.className = 'message-actions';

        const replyBtn = document.createElement('button');
        replyBtn.className = 'message-action-btn';
        replyBtn.textContent = '↪ Reply';
        replyBtn.addEventListener('click', () => setReply(msg));
        actions.appendChild(replyBtn);

        if (isOwn) {
            const editBtn = document.createElement('button');
            editBtn.className = 'message-action-btn';
            editBtn.textContent = '✏️ Edit';
            editBtn.addEventListener('click', () => startEditing(msg, bubble));
            actions.appendChild(editBtn);

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'message-action-btn';
            deleteBtn.textContent = '🗑 Delete';
            deleteBtn.addEventListener('click', () => handleDelete(msg.id));
            actions.appendChild(deleteBtn);
        }

        wrapper.appendChild(actions);
    }

    return wrapper;
}

function appendMedia(container, media) {
    const mediaDiv = document.createElement('div');
    mediaDiv.className = 'message-media';

    if (media.type === 'image') {
        const img = document.createElement('img');
        img.src = media.url;
        img.onerror = () => {
            mediaDiv.innerHTML = '';
            const err = document.createElement('span');
            err.className = 'media-error';
            err.textContent = 'Unable to load image.';
            mediaDiv.appendChild(err);
        };
        mediaDiv.appendChild(img);
    } else if (media.type === 'video') {
        const video = document.createElement('video');
        video.controls = true;
        video.src = media.url;
        video.onerror = () => {
            mediaDiv.innerHTML = '';
            const err = document.createElement('span');
            err.className = 'media-error';
            err.textContent = 'Unable to play this video.';
            mediaDiv.appendChild(err);
        };
        mediaDiv.appendChild(video);
    }

    container.appendChild(mediaDiv);
}

function detectAndAppendMedia(container, text) {
    if (!text) return;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const match = text.match(urlRegex);
    if (!match) return;

    const url = match[0];
    const isImage = /\.(jpeg|jpg|gif|png|webp)$/i.test(url);
    const isVideo = /\.(mp4|webm|ogg)$/i.test(url);

    if (isImage) {
        appendMedia(container, { type: 'image', url });
    } else if (isVideo) {
        appendMedia(container, { type: 'video', url });
    }
}

function setReply(message) {
    replyingTo = {
        messageId: message.id,
        username: message.username || 'User',
        message: message.message
    };
    
    if (replyPreviewUserEl) replyPreviewUserEl.textContent = replyingTo.username;
    if (replyPreviewMessageEl) replyPreviewMessageEl.textContent = replyingTo.message;
    if (replyPreviewEl) replyPreviewEl.style.display = 'flex';
    if (messageInputEl) messageInputEl.focus();
}

function cancelReply() {
    replyingTo = null;
    if (replyPreviewEl) replyPreviewEl.style.display = 'none';
}

function startEditing(message, bubbleEl) {
    editingMessageId = message.id;
    
    // Clear bubble and add edit form
    bubbleEl.innerHTML = '';
    
    const editForm = document.createElement('div');
    editForm.className = 'edit-mode';
    
    const input = document.createElement('textarea');
    input.className = 'edit-input';
    input.value = message.message;
    editForm.appendChild(input);
    
    const btnContainer = document.createElement('div');
    btnContainer.style.display = 'flex';
    btnContainer.style.gap = '10px';
    
    const saveBtn = document.createElement('button');
    saveBtn.className = 'btn btn--primary btn--sm';
    saveBtn.textContent = 'Save';
    saveBtn.addEventListener('click', () => handleSaveEdit(message.id, input.value));
    
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn btn--outline btn--sm';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('click', () => {
        editingMessageId = null;
        loadMessages(); // Revert UI
    });
    
    btnContainer.appendChild(saveBtn);
    btnContainer.appendChild(cancelBtn);
    editForm.appendChild(btnContainer);
    
    bubbleEl.appendChild(editForm);
}

async function handleSend() {
    if (!messageInputEl) return;
    const message = messageInputEl.value.trim();
    if (!message) return;
    if (message.length > 500) {
        showToast('Message cannot exceed 500 characters.', 'error');
        return;
    }

    isSending = true;
    if (sendBtnEl) {
        sendBtnEl.disabled = true;
        sendBtnEl.innerText = 'Sending...';
    }

    try {
               if (editingMessageId) {
            await api.updateChatMessage(editingMessageId, message);
            editingMessageId = null;
        } else {
            // Construct the payload object exactly as api.js expects it
            const payload = { message };
            if (replyingTo) {
                payload.replyToId = replyingTo.messageId;
            }
            
            if (activeChat === 'private') {
                await api.sendPrivateMessage(payload);
            } else {
                await api.sendPublicMessage(payload);
            }
        }

        messageInputEl.value = '';
        cancelReply();
        await loadMessages(); // Immediate refresh
    } catch (error) {
        console.error('Send error:', error);
        showToast('Unable to send message.', 'error');
    } finally {
        isSending = false;
        if (sendBtnEl) {
            sendBtnEl.disabled = false;
            sendBtnEl.innerText = 'Send';
        }
    }
}

async function handleSaveEdit(messageId, newMessage) {
    if (!newMessage.trim()) return;
    try {
        await api.updateChatMessage(messageId, newMessage.trim());
        editingMessageId = null;
        await loadMessages();
    } catch (error) {
        showToast('Unable to edit this message.', 'error');
        editingMessageId = null;
        loadMessages(); // Revert
    }
}

async function handleDelete(messageId) {
    if (!confirm('Delete this message?')) return;
    
    try {
        await api.deleteChatMessage(messageId);
        await loadMessages();
    } catch (error) {
        showToast('Unable to delete this message.', 'error');
    }
}