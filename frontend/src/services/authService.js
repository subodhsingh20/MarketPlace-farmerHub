import axios from "axios";

const defaultApiBaseUrl =
  typeof window !== "undefined"
    ? `${window.location.protocol}//${window.location.hostname}:5000/api`
    : "http://localhost:5000/api";

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || defaultApiBaseUrl,
});

const storedToken =
  typeof window !== "undefined" ? window.localStorage.getItem("token") : null;

if (storedToken) {
  api.defaults.headers.common.Authorization = `Bearer ${storedToken}`;
}

export function registerUser(payload) {
  return api.post("/auth/register", payload);
}

export function loginUser(payload) {
  return api.post("/auth/login", payload);
}

export function getAllProducts() {
  return api.get("/products");
}

export function getNearbyProducts(latitude, longitude) {
  return api.get(`/products/nearby?latitude=${latitude}&longitude=${longitude}`);
}

export function getNearestFarmers(latitude, longitude) {
  return api.get(`/farmers/nearest?lat=${latitude}&lon=${longitude}`);
}

export function geocodeAddress(address) {
  return api.get(`/auth/geocode?q=${encodeURIComponent(address)}`);
}

export function createPaymentOrder(payload) {
  return api.post("/payments/create-order", payload);
}

export function createMockPayment(payload) {
  return api.post("/payment/mock", payload);
}

export function createCashOnDeliveryOrder(payload) {
  return api.post("/payments/cod", payload);
}

export function verifyPayment(payload) {
  return api.post("/payments/verify", payload);
}

export function getUserOrders() {
  return api.get("/orders/my-orders");
}

export function getCustomerAddresses() {
  return api.get("/customer/addresses");
}

export function addCustomerAddress(payload) {
  return api.post("/customer/address", payload);
}

export function updateCustomerAddress(addressId, payload) {
  return api.put(`/customer/address/${addressId}`, payload);
}

export function deleteCustomerAddress(addressId) {
  return api.delete(`/customer/address/${addressId}`);
}

export function getFarmerOrders() {
  return api.get("/orders/farmer");
}

export function getFarmerAnalytics() {
  return api.get("/orders/farmer/analytics");
}

export function updateOrderStatus(orderId, status) {
  return api.patch(`/orders/${orderId}/status`, { status });
}

export function getProductsByFarmer(farmerId) {
  return api.get(`/products/farmer/${farmerId}`);
}

export function sendChatMessage(payload) {
  return api.post("/chat/send", payload);
}

export function markChatAsRead(payload) {
  return api.patch("/chat/read", payload);
}

export function getChatHistory(senderId, receiverId, orderId) {
  const query = new URLSearchParams({
    senderId,
    receiverId,
  });

  if (orderId) {
    query.set("orderId", orderId);
  }

  return api.get(`/chat/history?${query.toString()}`);
}

export function getChatConversations() {
  return api.get("/chat/conversations");
}

export function deleteChatConversation(otherUserId) {
  return api.delete(`/chat/conversation/${otherUserId}`);
}

export function addProduct(payload) {
  return api.post("/products", payload);
}

export function updateProduct(productId, payload) {
  return api.put(`/products/${productId}`, payload);
}

export function deleteProduct(productId) {
  return api.delete(`/products/${productId}`);
}

export function setAuthToken(token) {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
}

export default api;
