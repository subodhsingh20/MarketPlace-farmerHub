import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useSocket } from "../context/SocketContext";
import FadeIn from "../components/FadeIn";
import {
  createMockPayment,
  createPaymentOrder,
  getUserOrders,
  verifyPayment,
} from "../services/authService";

const PAYMENT_MODE =
  (process.env.REACT_APP_PAYMENT_MODE || "test").toLowerCase() === "live"
    ? "live"
    : "test";
const RAZORPAY_KEY_ID = process.env.REACT_APP_RAZORPAY_KEY_ID || "";
const LIVE_PAYMENT_GATEWAY_URL =
  process.env.REACT_APP_PAYMENT_GATEWAY_URL ||
  "https://checkout.razorpay.com/v1/checkout.js";

function CustomerDashboard() {
  const { user } = useAuth();
  const location = useLocation();
  const { socket } = useSocket();
  const {
    cartItems,
    cartTotal,
    clearCart,
    removeFromCart,
    updateCartQuantity,
    increaseCartQuantity,
    decreaseCartQuantity,
  } = useCart();
  const [fulfillmentType, setFulfillmentType] = useState("delivery");
  const [checkoutMessage, setCheckoutMessage] = useState("");
  const [checkoutError, setCheckoutError] = useState("");
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [orders, setOrders] = useState([]);
  const [alerts, setAlerts] = useState([]);

  const loadOrders = async () => {
    try {
      const response = await getUserOrders();
      setOrders(response.data.orders || []);
    } catch (_error) {
      // Keep dashboard functional if order loading fails.
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  useEffect(() => {
    if (location.hash === "#cart-summary") {
      const target = document.getElementById("cart-summary");
      target?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [location.hash]);

  useEffect(() => {
    if (!socket) {
      return undefined;
    }

    const handleOrderAlert = (alert) => {
      setAlerts((current) => [alert, ...current].slice(0, 6));
      loadOrders();
    };

    const handleChatAlert = (alert) => {
      setAlerts((current) => [alert, ...current].slice(0, 6));
    };

    socket.on("order_alert", handleOrderAlert);
    socket.on("chat_message", handleChatAlert);

    return () => {
      socket.off("order_alert", handleOrderAlert);
      socket.off("chat_message", handleChatAlert);
    };
  }, [socket]);

  const loadRazorpayScript = () =>
    new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }

      const existingScript = document.getElementById("razorpay-checkout-script");

      if (existingScript) {
        existingScript.addEventListener("load", () => resolve(true), { once: true });
        existingScript.addEventListener("error", () => resolve(false), { once: true });
        return;
      }

      const script = document.createElement("script");
      script.id = "razorpay-checkout-script";
      script.src = LIVE_PAYMENT_GATEWAY_URL;
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });

  const handleCheckout = async () => {
    if (!cartItems.length) {
      setCheckoutError("Your cart is empty.");
      return;
    }

    setIsProcessingPayment(true);
    setCheckoutError("");
    setCheckoutMessage("");

    try {
      const paymentPayload = {
        products: cartItems.map((item) => ({
          productId: item._id,
          quantity: item.quantityInCart,
        })),
        fulfillmentType,
      };

      if (PAYMENT_MODE === "test") {
        await createMockPayment(paymentPayload);
        clearCart();
        setCheckoutMessage("Payment successful (test mode).");
        setCheckoutError("");
        await loadOrders();
        setIsProcessingPayment(false);
        return;
      }

      if (!RAZORPAY_KEY_ID) {
        setCheckoutError("Add REACT_APP_RAZORPAY_KEY_ID to your frontend environment.");
        setIsProcessingPayment(false);
        return;
      }

      const isLoaded = await loadRazorpayScript();

      if (!isLoaded) {
        setCheckoutError("Failed to load Razorpay checkout.");
        setIsProcessingPayment(false);
        return;
      }

      const response = await createPaymentOrder(paymentPayload);

      const { amount, keyId, razorpayOrderId } = response.data;

      const razorpay = new window.Razorpay({
        key: keyId || RAZORPAY_KEY_ID,
        amount,
        currency: "INR",
        name: "Farmer Marketplace",
        description: "Pay for your fresh produce order",
        order_id: razorpayOrderId,
        prefill: {
          name: user?.name,
          email: user?.email,
        },
        handler: async (paymentResponse) => {
          try {
            await verifyPayment(paymentResponse);
            clearCart();
            setCheckoutMessage("Payment successful.");
            setCheckoutError("");
            loadOrders();
          } catch (requestError) {
            setCheckoutError(
              requestError.response?.data?.message || "Payment verification failed."
            );
          } finally {
            setIsProcessingPayment(false);
          }
        },
        modal: {
          ondismiss: () => {
            setIsProcessingPayment(false);
          },
        },
        theme: {
          color: "#059669",
        },
      });

      razorpay.open();
    } catch (requestError) {
      setCheckoutError(
        requestError.response?.data?.message ||
          requestError.response?.data?.error ||
          "Failed to start payment."
      );
      setIsProcessingPayment(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50">
      <FadeIn>
        <div className="responsive-shell">
          {/* Hero Section */}
          <FadeIn delay={0.1}>
            <div className="responsive-card mb-6 border border-gray-100 bg-white shadow-2xl">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
                <div className="lg:col-span-2">
                  <span className="responsive-chip mb-5 inline-block bg-emerald-100 text-emerald-800">Customer Dashboard</span>
                  <h1 className="responsive-title mb-5 font-bold">
                    Welcome back, {user?.name}.
                  </h1>
                  <p className="responsive-copy max-w-2xl">
                    Review cart activity, track live order updates, and move through checkout with a cleaner purchase flow.
                  </p>
                </div>

                <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 p-6 text-white">
                  <h3 className="text-lg font-semibold mb-6">Quick Summary</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-emerald-100">Cart Items</span>
                      <span className="text-2xl font-bold">{cartItems.length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-emerald-100">Total Value</span>
                      <span className="text-2xl font-bold">₹{cartTotal}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-emerald-100">Orders</span>
                      <span className="text-2xl font-bold">{orders.length}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </FadeIn>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            {/* Main Content */}
            <div className="xl:col-span-2 space-y-8">
              {/* Alerts Section */}
              <FadeIn delay={0.2}>
                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-xl">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">Your Alerts</h2>
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-sm font-semibold rounded-full">
                      {alerts.length} recent
                    </span>
                  </div>

                  {alerts.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4.868 12.683A17.925 17.925 0 012 21h13.395a2 2 0 002-2v-1.5a2 2 0 00-2-2H8.5a2 2 0 01-2-2V8.5a2 2 0 012-2h2.5a2 2 0 002-2V5a2 2 0 00-2-2H8.5a6.5 6.5 0 100 13z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">No alerts yet</h3>
                      <p className="text-gray-600">You will see live order updates here.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {alerts.map((alert, index) => (
                        <div key={`${alert.orderId}_${index}`} className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
                          <div className="flex items-start space-x-3">
                            <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">{alert.message}</p>
                              <p className="text-sm text-gray-600">Status: {alert.status}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </FadeIn>

              {/* Cart Section */}
              <FadeIn delay={0.3}>
                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-xl">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">Your Cart</h2>
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-sm font-semibold rounded-full">
                      {cartItems.length} items
                    </span>
                  </div>

                  {cartItems.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Your cart is empty</h3>
                      <p className="text-gray-600">Visit the products page to add fresh produce.</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {cartItems.map((item) => (
                        <div key={item._id} className="rounded-xl border border-gray-200 bg-gray-50 p-5">
                          <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-6">
                            <img
                              src={item.imageUrl}
                              alt={item.name}
                              className="w-full md:w-24 h-48 md:h-24 object-cover rounded-lg"
                            />
                            <div className="flex-1">
                              <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-4">
                                <div>
                                  <h3 className="text-lg font-semibold text-gray-900">{item.name}</h3>
                                  <p className="text-sm text-gray-600">{item.category}</p>
                                  <p className="text-sm text-gray-600">Farmer: {item.farmerId?.name || "Unknown farmer"}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-2xl font-bold text-emerald-600">₹{item.price}</p>
                                </div>
                              </div>

                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                                <div className="flex items-center space-x-4">
                                  <label className="text-sm font-medium text-gray-700">Quantity:</label>
                                  <div className="flex items-center border border-gray-300 rounded-lg">
                                    <button
                                      type="button"
                                      className="px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 transition-colors"
                                      onClick={() => decreaseCartQuantity(item._id)}
                                      aria-label={`Decrease quantity of ${item.name}`}
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                                      </svg>
                                    </button>
                                    <input
                                      type="number"
                                      min="1"
                                      max={item.quantity}
                                      value={item.quantityInCart}
                                      onChange={(event) =>
                                        updateCartQuantity(item._id, Number(event.target.value))
                                      }
                                      className="w-16 px-3 py-2 text-center border-0 focus:ring-0"
                                    />
                                    <button
                                      type="button"
                                      className="px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 transition-colors"
                                      onClick={() => increaseCartQuantity(item._id)}
                                      aria-label={`Increase quantity of ${item.name}`}
                                      disabled={item.quantityInCart >= item.quantity}
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                      </svg>
                                    </button>
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-colors"
                                  onClick={() => removeFromCart(item._id)}
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </FadeIn>

              {/* Orders Section */}
              <FadeIn delay={0.4}>
                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-xl">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">Your Orders</h2>
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-sm font-semibold rounded-full">
                      {orders.length} total
                    </span>
                  </div>

                  {orders.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">No orders yet</h3>
                      <p className="text-gray-600">Once you place an order, it will appear here.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {orders.map((order) => (
                        <div key={order._id} className="rounded-xl border border-gray-200 bg-gray-50 p-5">
                          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900">Order #{String(order._id).slice(-6)}</h3>
                              <span className={`inline-block px-3 py-1 text-xs font-semibold rounded-full mt-2 ${
                                order.status === 'completed' ? 'bg-green-100 text-green-800' :
                                order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-blue-100 text-blue-800'
                              }`}>
                                {order.status}
                              </span>
                            </div>
                            <div className="text-right mt-4 md:mt-0">
                              <p className="text-2xl font-bold text-emerald-600">₹{order.totalPrice}</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                            <div>
                              <span className="font-medium">Fulfillment:</span> {order.fulfillmentType}
                            </div>
                            <div>
                              <span className="font-medium">Payment:</span> {order.paymentStatus}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </FadeIn>
            </div>

            {/* Sidebar */}
            <div className="space-y-8">
              {/* Cart Summary */}
              <FadeIn delay={0.5}>
                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-xl" id="cart-summary">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Cart Summary</h2>

                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Fulfillment Type
                      </label>
                      <select
                        value={fulfillmentType}
                        onChange={(event) => setFulfillmentType(event.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-300 text-gray-900 bg-white"
                      >
                        <option value="delivery">Delivery</option>
                        <option value="pickup">Pickup</option>
                      </select>
                    </div>

                    {checkoutError && (
                      <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                        <div className="flex items-center">
                          <svg className="w-5 h-5 text-red-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <p className="text-red-700 font-medium">{checkoutError}</p>
                        </div>
                      </div>
                    )}

                    {checkoutMessage && (
                      <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                        <div className="flex items-center">
                          <svg className="w-5 h-5 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <p className="text-green-700 font-medium">{checkoutMessage}</p>
                        </div>
                      </div>
                    )}

                    <button
                      type="button"
                      className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all duration-300 transform hover:scale-105 hover:shadow-2xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                      onClick={handleCheckout}
                      disabled={isProcessingPayment || cartItems.length === 0}
                    >
                      {isProcessingPayment ? (
                        <div className="flex items-center justify-center">
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Processing Payment...
                        </div>
                      ) : (
                        <div className="flex items-center justify-center">
                          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                          </svg>
                          {PAYMENT_MODE === "test"
                            ? "Pay in Test Mode"
                            : "Pay with Razorpay"}
                        </div>
                      )}
                    </button>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 gap-4">
                      <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-blue-800">Total Items</p>
                            <p className="text-2xl font-bold text-blue-900">
                              {cartItems.reduce((total, item) => total + item.quantityInCart, 0)}
                            </p>
                          </div>
                          <div className="w-10 h-10 bg-blue-200 rounded-full flex items-center justify-center">
                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                            </svg>
                          </div>
                        </div>
                        <p className="text-xs text-blue-600 mt-2">Items queued for checkout</p>
                      </div>

                      <div className="bg-gradient-to-r from-emerald-50 to-emerald-100 rounded-xl p-4 border border-emerald-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-emerald-800">Total Amount</p>
                            <p className="text-2xl font-bold text-emerald-900">₹{cartTotal}</p>
                          </div>
                          <div className="w-10 h-10 bg-emerald-200 rounded-full flex items-center justify-center">
                            <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                            </svg>
                          </div>
                        </div>
                        <p className="text-xs text-emerald-600 mt-2">Live cart total</p>
                      </div>

                      <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-purple-800">Status</p>
                            <p className="text-2xl font-bold text-purple-900">
                              {cartItems.length ? "Ready" : "Idle"}
                            </p>
                          </div>
                          <div className="w-10 h-10 bg-purple-200 rounded-full flex items-center justify-center">
                            <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                        </div>
                        <p className="text-xs text-purple-600 mt-2">
                          {PAYMENT_MODE === "test"
                            ? "Mock gateway enabled"
                            : "Connected to Razorpay"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </FadeIn>
            </div>
          </div>
        </div>
      </FadeIn>
    </div>
  );
}

export default CustomerDashboard;
