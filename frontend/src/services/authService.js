import axios from "axios";

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:5000/api",
});

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

export function createPaymentOrder(payload) {
  return api.post("/payments/create-order", payload);
}

export function verifyPayment(payload) {
  return api.post("/payments/verify", payload);
}

export function getUserOrders() {
  return api.get("/orders/my-orders");
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

export function rateProduct(productId, rating) {
  return api.post(`/ratings/products/${productId}`, { rating });
}

export function rateFarmer(farmerId, rating) {
  return api.post(`/ratings/farmers/${farmerId}`, { rating });
}

export function getProductsByFarmer(farmerId) {
  return api.get(`/products/farmer/${farmerId}`);
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
