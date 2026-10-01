// ===============================================
// API Utility (Live Backend)
// Connects directly to your Node.js + Express backend
// ===============================================

// const API_BASE_URL = 'https://smmmaria-backend-production-3ae4.up.railway.app/api/v1';
const API_BASE_URL = "https://smmmaria-backend-production-47ff.up.railway.app/api/v1"; // Local development backendß

/**
 * Fetch wrapper to automatically include the JWT token in headers
 * Includes a 15-second AbortController timeout to prevent UI freezing.
 */
async function request(endpoint, method = "GET", body = null) {
 const token = localStorage.getItem("smmmaria_token");
 
 const headers = {
  "Content-Type": "application/json",
 };
 
 if (token) {
  headers["Authorization"] = `Bearer ${token}`;
 }
 
 const config = { method, headers };
 
 if (body) {
  config.body = JSON.stringify(body);
 }
 
 // --- NEW: AbortController Timeout ---
 const controller = new AbortController();
 const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 seconds
 config.signal = controller.signal;
 
 try {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
  const data = await response.json();
  
  if (!response.ok) {
   throw new Error(data.message || "Something went wrong");
  }
  return data;
 } catch (error) {
  if (error.name === "AbortError") {
   console.error(
    `API Timeout [${endpoint}]: Request took longer than 15 seconds.`,
   );
   throw new Error(
    "Request timed out. The server is taking too long to respond.",
   );
  }
  console.error(`API Error [${endpoint}]:`, error.message);
  throw error;
 } finally {
  clearTimeout(timeoutId);
 }
}

export const api = {
 // Auth
 login: (identifier, password) =>
  request("/auth/login", "POST", { identifier, password }),
 register: (data) => request("/auth/register", "POST", data),
 googleAuth: (code) => request("/auth/google", "POST", { code }),
 getMe: () => request("/auth/me"),
 
 // Services & Orders
 getServices: () => request("/services"),
 getCategories: () => request("/services/categories?withCounts=true"),
 createOrder: (serviceId, link, quantity) =>
  request("/orders", "POST", { serviceId, link, quantity }),
 getOrders: () => request("/orders"),
 
 // Wallet & Payments
 getWallet: () => request("/wallet"),
 createDeposit: (payload) => request("/payments/deposit", "POST", payload),
 cancelPendingDeposit: () => request("/payments/cancel", "POST"),
 getPayments: () => request("/payments"),
 getPaymentStatus: (id) => request(`/payments/${id}/status`),
 
 // Child Panel
 purchaseChildPanel: (data) => request("/child-panel/purchase", "POST", data),
 
 // Tickets
 getTickets: () => request("/tickets"),
 createTicket: (data) => request("/tickets", "POST", data),
 getTicketById: (id) => request(`/tickets/${id}`),
 replyTicket: (id, message) =>
  request(`/tickets/${id}/reply`, "POST", { message }),
 
 // Refills
 requestRefill: (orderId, link) =>
  request("/refills", "POST", { orderId, link }),
 getRefills: () => request("/refills", "GET"),
 
 // Notifications
 getNotifications: () => request("/notifications"),
 markNotificationRead: (id) => request(`/notifications/${id}/read`, "PUT"),
 
 // Profile / Settings
 updateProfile: (data) => request("/users/profile", "PUT", data),
 deleteAccount: () => request("/users/me", "DELETE"),
 
 // API Key
 regenerateApiKey: () => request("/users/apikey", "POST"),
 
 // ===============================================
 // LIVE CHAT
 // ===============================================
 getPrivateChat: () => request("/chat/private"),
 sendPrivateMessage: (payload) => request("/chat/private", "POST", payload),
 getPublicChat: () => request("/chat/public"),
 sendPublicMessage: (payload) => request("/chat/public", "POST", payload),
 updateChatMessage: (messageId, message) =>
  request(`/chat/messages/${messageId}`, "PATCH", { message }),
 deleteChatMessage: (messageId) =>
  request(`/chat/messages/${messageId}`, "DELETE"),
 
 // ===============================================
 // BUY ACCOUNT MARKETPLACE
 // ===============================================
 getAccountCategories: () => request("/accounts/categories"),
 getAccounts: (filters = {}) => {
  const query = new URLSearchParams(filters).toString();
  return request(`/accounts${query ? `?${query}` : ""}`);
 },
 getAccountDetails: (id) => request(`/accounts/${id}`),
 purchaseAccount: (id) => request(`/accounts/${id}/purchase`, "POST"),
 getMyAccountPurchases: () => request("/accounts/purchases"),
 getMyAccountPurchase: (id) => request(`/accounts/purchases/${id}`),
 getAccountInvoice: (id) => request(`/accounts/purchases/${id}/invoice`),
};
