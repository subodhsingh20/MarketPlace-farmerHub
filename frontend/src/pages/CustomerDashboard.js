import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import FadeIn from "../components/FadeIn";
import SelectAddressSection from "../components/SelectAddressSection";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useSocket } from "../context/SocketContext";
import {
  addCustomerAddress,
  createCashOnDeliveryOrder,
  createMockPayment,
  createPaymentOrder,
  getCustomerAddresses,
  getUserOrders,
  verifyPayment,
} from "../services/authService";
import { formatPriceWithUnit, formatQuantityWithUnit } from "../utils/productUnits";

const PAYMENT_MODE =
  (process.env.REACT_APP_PAYMENT_MODE || "test").toLowerCase() === "live"
    ? "live"
    : "test";
const RAZORPAY_KEY_ID = process.env.REACT_APP_RAZORPAY_KEY_ID || "";
const LIVE_PAYMENT_GATEWAY_URL =
  process.env.REACT_APP_PAYMENT_GATEWAY_URL ||
  "https://checkout.razorpay.com/v1/checkout.js";

const formatCurrency = (value) => `Rs. ${Number(value || 0)}`;

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
  const [paymentMethod, setPaymentMethod] = useState("online");
  const [checkoutMessage, setCheckoutMessage] = useState("");
  const [checkoutError, setCheckoutError] = useState("");
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [orders, setOrders] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [addressError, setAddressError] = useState("");

  const loadOrders = async () => {
    try {
      const response = await getUserOrders();
      setOrders(response.data.orders || []);
    } catch (_error) {}
  };

  const loadAddresses = async () => {
    try {
      const response = await getCustomerAddresses();
      const savedAddresses = response.data.addresses || [];
      setAddresses(savedAddresses);
      setSelectedAddressId((current) => {
        if (current && savedAddresses.some((address) => address._id === current)) {
          return current;
        }
        return savedAddresses[0]?._id || "";
      });
    } catch (error) {
      setAddressError(error.response?.data?.message || "Failed to load saved addresses.");
    }
  };

  useEffect(() => {
    loadOrders();
    loadAddresses();
  }, []);

  useEffect(() => {
    if (location.hash === "#cart-summary") {
      document.getElementById("cart-summary")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [location.hash]);

  useEffect(() => {
    if (!socket) return undefined;
    const handleOrderAlert = () => loadOrders();
    socket.on("order_alert", handleOrderAlert);
    return () => socket.off("order_alert", handleOrderAlert);
  }, [socket]);

  const handleAddAddress = async (formValues) => {
    try {
      setIsSavingAddress(true);
      setAddressError("");
      const response = await addCustomerAddress(formValues);
      const savedAddresses = response.data.addresses || [];
      const newestAddress = response.data.address;
      setAddresses(savedAddresses);
      if (newestAddress?._id) setSelectedAddressId(newestAddress._id);
      return newestAddress;
    } catch (error) {
      const validationErrors = error.response?.data?.errors;
      setAddressError(
        validationErrors
          ? Object.values(validationErrors)[0]
          : error.response?.data?.message || "Failed to save the address."
      );
      return null;
    } finally {
      setIsSavingAddress(false);
    }
  };

  const selectedAddress =
    addresses.find((address) => address._id === selectedAddressId) || null;

  const loadRazorpayScript = () =>
    new Promise((resolve) => {
      if (window.Razorpay) return resolve(true);
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
    if (!cartItems.length) return setCheckoutError("Your cart is empty.");
    if (!selectedAddress) {
      return setCheckoutError("Please select or add an address before checkout.");
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
        selectedAddressId: selectedAddress._id,
      };

      if (paymentMethod === "cod") {
        await createCashOnDeliveryOrder(paymentPayload);
        clearCart();
        setCheckoutMessage("Cash on delivery order placed successfully.");
        await loadOrders();
        await loadAddresses();
        setIsProcessingPayment(false);
        return;
      }

      if (PAYMENT_MODE === "test") {
        await createMockPayment(paymentPayload);
        clearCart();
        setCheckoutMessage("Payment successful (test mode).");
        await loadOrders();
        await loadAddresses();
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
        prefill: { name: user?.name, email: user?.email },
        handler: async (paymentResponse) => {
          try {
            await verifyPayment(paymentResponse);
            clearCart();
            setCheckoutMessage("Payment successful.");
            await loadOrders();
            await loadAddresses();
          } catch (requestError) {
            setCheckoutError(
              requestError.response?.data?.message || "Payment verification failed."
            );
          } finally {
            setIsProcessingPayment(false);
          }
        },
        modal: { ondismiss: () => setIsProcessingPayment(false) },
        theme: { color: "#059669" },
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
          <div className="responsive-card mb-6 border border-gray-100 bg-white shadow-2xl">
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3 lg:items-center">
              <div className="lg:col-span-2">
                <span className="responsive-chip mb-5 inline-block bg-emerald-100 text-emerald-800">Customer Dashboard</span>
                <h1 className="responsive-title mb-5 font-bold">Welcome back, {user?.name}.</h1>
                <p className="responsive-copy max-w-2xl">Review cart activity, track live order updates, and move through checkout with a cleaner purchase flow.</p>
              </div>
              <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 p-6 text-white">
                <h3 className="mb-6 text-lg font-semibold">Quick Summary</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between"><span className="text-emerald-100">Cart Items</span><span className="text-2xl font-bold">{cartItems.length}</span></div>
                  <div className="flex items-center justify-between"><span className="text-emerald-100">Total Value</span><span className="text-2xl font-bold">{formatCurrency(cartTotal)}</span></div>
                  <div className="flex items-center justify-between"><span className="text-emerald-100">Orders</span><span className="text-2xl font-bold">{orders.length}</span></div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <div className="space-y-6 xl:col-span-3">
              <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-xl">
                <div className="mb-6 flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900">Your Cart</h2>
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-800">{cartItems.length} items</span>
                </div>
                {cartItems.length === 0 ? (
                  <div className="py-12 text-center"><h3 className="text-lg font-semibold text-gray-900">Your cart is empty</h3><p className="text-gray-600">Visit the products page to add fresh produce.</p></div>
                ) : (
                  <div className="space-y-6">
                    {cartItems.map((item) => (
                      <div key={item._id} className="rounded-xl border border-gray-200 bg-gray-50 p-5">
                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-6">
                          <img src={item.imageUrl} alt={item.name} className="h-48 w-full rounded-lg object-cover md:h-24 md:w-24" />
                          <div className="flex-1">
                            <div className="mb-4 flex flex-col md:flex-row md:items-start md:justify-between">
                              <div>
                                <h3 className="text-lg font-semibold text-gray-900">{item.name}</h3>
                                <p className="text-sm text-gray-600">{item.category}</p>
                                <p className="text-sm text-gray-600">Farmer: {item.farmerId?.name || "Unknown farmer"}</p>
                              </div>
                              <p className="text-2xl font-bold text-emerald-600">
                                {formatPriceWithUnit(item.price, item)}
                              </p>
                            </div>
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                              <div className="flex items-center gap-4">
                                <label className="text-sm font-medium text-gray-700">Quantity:</label>
                                <div className="flex items-center rounded-lg border border-gray-300">
                                  <button type="button" className="px-3 py-2" onClick={() => decreaseCartQuantity(item._id)}>-</button>
                                  <input type="number" min="1" max={item.quantity} value={item.quantityInCart} onChange={(event) => updateCartQuantity(item._id, Number(event.target.value))} className="w-20 border-0 px-3 py-2 text-center focus:ring-0" />
                                  <button type="button" className="px-3 py-2" onClick={() => increaseCartQuantity(item._id)} disabled={item.quantityInCart >= item.quantity}>+</button>
                                </div>
                                <span className="text-sm text-gray-500">
                                  {formatQuantityWithUnit(item.quantityInCart, item)}
                                </span>
                              </div>
                              <button type="button" className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600" onClick={() => removeFromCart(item._id)}>Remove</button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <SelectAddressSection
                addresses={addresses}
                selectedAddressId={selectedAddressId}
                onSelectAddress={(addressId) => {
                  setSelectedAddressId(addressId);
                  setAddressError("");
                  setCheckoutError("");
                }}
                onAddAddress={handleAddAddress}
                isSubmitting={isSavingAddress}
                saveError={addressError}
              />

              <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-xl" id="cart-summary">
                <h2 className="mb-6 text-2xl font-bold text-gray-900">Cart Summary</h2>
                <div className="space-y-6">
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                    <p className="text-sm font-semibold text-emerald-800">Selected Address</p>
                    {selectedAddress ? (
                      <div className="mt-2 text-sm leading-6 text-emerald-900">
                        <p className="font-semibold">{selectedAddress.label} - {selectedAddress.name}</p>
                        <p>{selectedAddress.street}, {selectedAddress.city}, {selectedAddress.state} - {selectedAddress.pincode}</p>
                      </div>
                    ) : <p className="mt-2 text-sm text-emerald-700">Add or choose an address to continue.</p>}
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">Fulfillment Type</label>
                    <select value={fulfillmentType} onChange={(event) => setFulfillmentType(event.target.value)} className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-emerald-500">
                      <option value="delivery">Delivery</option>
                      <option value="pickup">Pickup</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">Payment Method</label>
                    <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)} className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-emerald-500">
                      <option value="online">{PAYMENT_MODE === "test" ? "Online payment (test mode)" : "Online payment"}</option>
                      <option value="cod">Cash on Delivery</option>
                    </select>
                  </div>

                  {checkoutError && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">{checkoutError}</div>}
                  {checkoutMessage && <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-medium text-green-700">{checkoutMessage}</div>}

                  <button type="button" className="w-full rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 px-8 py-4 text-lg font-bold text-white shadow-lg transition-all duration-300 hover:from-emerald-700 hover:to-green-700 disabled:cursor-not-allowed disabled:opacity-50" onClick={handleCheckout} disabled={isProcessingPayment || cartItems.length === 0}>
                    {isProcessingPayment
                      ? "Processing Payment..."
                      : paymentMethod === "cod"
                        ? "Place COD Order"
                        : PAYMENT_MODE === "test"
                          ? "Pay in Test Mode"
                          : "Pay with Razorpay"}
                  </button>

                  <div className="grid grid-cols-1 gap-4">
                    <div className="rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50 to-blue-100 p-4">
                      <p className="text-sm font-medium text-blue-800">Total Products</p>
                      <p className="text-2xl font-bold text-blue-900">{cartItems.length}</p>
                    </div>
                    <div className="rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-emerald-100 p-4">
                      <p className="text-sm font-medium text-emerald-800">Total Amount</p>
                      <p className="text-2xl font-bold text-emerald-900">{formatCurrency(cartTotal)}</p>
                    </div>
                    <div className="rounded-xl border border-purple-200 bg-gradient-to-r from-purple-50 to-purple-100 p-4">
                      <p className="text-sm font-medium text-purple-800">Status</p>
                      <p className="text-2xl font-bold text-purple-900">{cartItems.length ? "Ready" : "Idle"}</p>
                      <p className="mt-2 text-xs text-purple-600">
                        {paymentMethod === "cod"
                          ? "Pay at delivery"
                          : PAYMENT_MODE === "test"
                            ? "Mock gateway enabled"
                            : "Connected to Razorpay"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </FadeIn>
    </div>
  );
}

export default CustomerDashboard;
