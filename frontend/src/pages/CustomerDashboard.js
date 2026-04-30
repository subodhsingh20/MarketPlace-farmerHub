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
  deleteCustomerAddress,
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
  const [deletingAddressId, setDeletingAddressId] = useState("");
  const [addressMessage, setAddressMessage] = useState("");
  const [orders, setOrders] = useState([]);
  const [addresses, setAddresses] = useState([]);

  useEffect(() => {
    if (!addressMessage) return undefined;
    const timeoutId = window.setTimeout(() => setAddressMessage(""), 3000);
    return () => window.clearTimeout(timeoutId);
  }, [addressMessage]);
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

  const handleDeleteAddress = async (addressId) => {
    if (!addressId) return;
    if (!window.confirm("Are you sure you want to delete this address?")) {
      return;
    }

    try {
      setDeletingAddressId(addressId);
      setAddressError("");
      setAddressMessage("");
      const response = await deleteCustomerAddress(addressId);
      const savedAddresses = response.data.addresses || [];
      setAddresses(savedAddresses);

      if (selectedAddressId === addressId) {
        setSelectedAddressId(savedAddresses[0]?._id || "");
      }

      setAddressMessage("Address deleted successfully.");
    } catch (error) {
      setAddressError(error.response?.data?.message || "Failed to delete the address.");
    } finally {
      setDeletingAddressId("");
    }
  };

  const selectedAddress =
    addresses.find((address) => address._id === selectedAddressId) || null;
  const completedOrders = orders.filter((order) => order.status === "completed").length;
  const pendingOrders = orders.filter(
    (order) => !["completed", "cancelled"].includes(order.status)
  ).length;

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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-emerald-950 to-slate-900 text-slate-100">
      <FadeIn>
        <div className="responsive-shell">
          <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/72 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.28)] backdrop-blur-xl sm:p-7">
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3 lg:items-center">
              <div className="lg:col-span-2">
                <span className="responsive-chip mb-5 inline-block border border-emerald-400/20 bg-emerald-400/15 text-emerald-100">Customer Dashboard</span>
                <h1 className="responsive-title mb-5 font-bold !text-white">Welcome back, {user?.name}.</h1>
                <p className="responsive-copy max-w-2xl !text-slate-300">Review cart activity, track live order updates, and move through checkout with a cleaner purchase flow.</p>
                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-white/10 bg-white/6 px-4 py-3 backdrop-blur-md">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-200">Cart</p>
                    <p className="mt-2 text-2xl font-bold text-white">{cartItems.length}</p>
                    <p className="text-sm text-slate-300">Products ready to checkout</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/6 px-4 py-3 backdrop-blur-md">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-200">Orders</p>
                    <p className="mt-2 text-2xl font-bold text-white">{orders.length}</p>
                    <p className="text-sm text-slate-300">{pendingOrders} active, {completedOrders} completed</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/6 px-4 py-3 backdrop-blur-md">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-200">Addresses</p>
                    <p className="mt-2 text-2xl font-bold text-white">{addresses.length}</p>
                    <p className="text-sm text-slate-300">Saved for faster checkout</p>
                  </div>
                </div>
              </div>
              <div className="rounded-[1.75rem] border border-emerald-400/20 bg-gradient-to-br from-emerald-500 to-green-600 p-6 text-white shadow-[0_20px_60px_rgba(16,185,129,0.28)]">
                <h3 className="mb-6 text-lg font-semibold">Checkout Snapshot</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between"><span className="text-emerald-100">Current Total</span><span className="text-2xl font-bold">{formatCurrency(cartTotal)}</span></div>
                  <div className="flex items-center justify-between"><span className="text-emerald-100">Payment Mode</span><span className="text-lg font-semibold">{PAYMENT_MODE === "test" ? "Test" : "Live"}</span></div>
                  <div className="flex items-center justify-between"><span className="text-emerald-100">Selected Address</span><span className="text-lg font-semibold">{selectedAddress ? "Ready" : "Needed"}</span></div>
                  <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-emerald-50/90">
                    Orders stay synced here while your cart, checkout, and saved addresses stay in one flow.
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <div className="space-y-6 xl:col-span-3">
              <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/72 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.28)] backdrop-blur-xl">
                <div className="mb-6 flex items-center justify-between">
                  <h2 className="text-2xl font-bold !text-white">Your Cart</h2>
                  <span className="rounded-full border border-emerald-400/20 bg-emerald-400/15 px-3 py-1 text-sm font-semibold text-emerald-100">{cartItems.length} items</span>
                </div>
                {cartItems.length === 0 ? (
                  <div className="py-12 text-center"><h3 className="text-lg font-semibold text-white">Your cart is empty</h3><p className="text-slate-300">Visit the products page to add fresh produce.</p></div>
                ) : (
                  <div className="space-y-5">
                    {cartItems.map((item) => (
                      <div key={item._id} className="rounded-[1.6rem] border border-white/10 bg-white/6 p-4 shadow-[0_18px_50px_rgba(15,23,42,0.16)] backdrop-blur-md transition duration-300 hover:-translate-y-0.5 hover:border-emerald-300/20 sm:p-5">
                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-6">
                          <img src={item.imageUrl} alt={item.name} className="h-40 w-full rounded-2xl object-cover md:h-24 md:w-24" />
                          <div className="flex-1">
                            <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                              <div>
                                <h3 className="text-lg font-semibold text-white">{item.name}</h3>
                                <p className="text-sm text-slate-300">{item.category}</p>
                                <p className="text-sm text-slate-300">Farmer: {item.farmerId?.name || "Unknown farmer"}</p>
                              </div>
                              <p className="text-2xl font-bold text-emerald-300">
                                {formatPriceWithUnit(item.price, item)}
                              </p>
                            </div>
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                              <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                                <label className="text-sm font-medium text-slate-200">Quantity:</label>
                                <div className="flex items-center rounded-2xl border border-white/10 bg-slate-950/40 shadow-sm">
                                  <button type="button" className="px-3 py-2 text-slate-200" onClick={() => decreaseCartQuantity(item._id)}>-</button>
                                  <input type="number" min="1" max={item.quantity} value={item.quantityInCart} onChange={(event) => updateCartQuantity(item._id, Number(event.target.value))} className="w-16 border-0 bg-transparent px-2 py-2 text-center text-slate-100 focus:ring-0" />
                                  <button type="button" className="px-3 py-2 text-slate-200" onClick={() => increaseCartQuantity(item._id)} disabled={item.quantityInCart >= item.quantity}>+</button>
                                </div>
                                <span className="text-sm text-slate-300">
                                  {formatQuantityWithUnit(item.quantityInCart, item)}
                                </span>
                              </div>
                              <button type="button" className="rounded-full bg-rose-500 px-4 py-2 text-sm font-medium text-white hover:bg-rose-600" onClick={() => removeFromCart(item._id)}>Remove</button>
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
                deletingAddressId={deletingAddressId}
                onSelectAddress={(addressId) => {
                  setSelectedAddressId(addressId);
                  setAddressError("");
                  setAddressMessage("");
                  setCheckoutError("");
                }}
                onAddAddress={handleAddAddress}
                onDeleteAddress={handleDeleteAddress}
                isSubmitting={isSavingAddress}
                saveError={addressError}
                successMessage={addressMessage}
              />

              <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/72 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.28)] backdrop-blur-xl sm:p-6" id="cart-summary">
                <h2 className="mb-5 text-2xl font-bold !text-white">Cart Summary</h2>
                <div className="space-y-5">
                  <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-3.5 sm:p-4">
                    <p className="text-sm font-semibold text-emerald-100">Selected Address</p>
                    {selectedAddress ? (
                      <div className="mt-2 text-sm leading-6 text-slate-200">
                        <p className="font-semibold">{selectedAddress.label} - {selectedAddress.name}</p>
                        <p>{selectedAddress.street}, {selectedAddress.city}, {selectedAddress.state} - {selectedAddress.pincode}</p>
                      </div>
                    ) : <p className="mt-2 text-sm text-emerald-100">Add or choose an address to continue.</p>}
                  </div>

                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-200">Fulfillment Type</label>
                      <select value={fulfillmentType} onChange={(event) => setFulfillmentType(event.target.value)} className="w-full premium-input px-4 py-2.5 text-slate-900">
                        <option value="delivery">Delivery</option>
                        <option value="pickup">Pickup</option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-200">Payment Method</label>
                      <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)} className="w-full premium-input px-4 py-2.5 text-slate-900">
                        <option value="online">{PAYMENT_MODE === "test" ? "Online payment (test mode)" : "Online payment"}</option>
                        <option value="cod">Cash on Delivery</option>
                      </select>
                    </div>
                  </div>

                  {checkoutError && <div className="rounded-xl border border-rose-400/20 bg-rose-500/10 p-3.5 text-sm font-medium text-rose-100">{checkoutError}</div>}
                  {checkoutMessage && <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-3.5 text-sm font-medium text-emerald-100">{checkoutMessage}</div>}

                  <button type="button" className="premium-button w-full bg-gradient-to-r from-emerald-400 to-lime-500 px-6 py-3.5 text-base font-bold text-slate-950 shadow-[0_20px_40px_rgba(16,185,129,0.26)] disabled:cursor-not-allowed disabled:opacity-50" onClick={handleCheckout} disabled={isProcessingPayment || cartItems.length === 0}>
                    {isProcessingPayment
                      ? "Processing Payment..."
                      : paymentMethod === "cod"
                        ? "Place COD Order"
                        : PAYMENT_MODE === "test"
                          ? "Pay in Test Mode"
                          : "Pay with Razorpay"}
                  </button>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="rounded-xl border border-sky-400/20 bg-sky-500/10 p-3.5">
                      <p className="text-sm font-medium text-sky-100">Total Products</p>
                      <p className="text-xl font-bold text-white sm:text-2xl">{cartItems.length}</p>
                    </div>
                    <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-3.5">
                      <p className="text-sm font-medium text-emerald-100">Total Amount</p>
                      <p className="text-xl font-bold text-white sm:text-2xl">{formatCurrency(cartTotal)}</p>
                    </div>
                    <div className="rounded-xl border border-violet-400/20 bg-violet-500/10 p-3.5">
                      <p className="text-sm font-medium text-violet-100">Status</p>
                      <p className="text-xl font-bold text-white sm:text-2xl">{cartItems.length ? "Ready" : "Idle"}</p>
                      <p className="mt-1.5 text-xs leading-5 text-violet-100/80">
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
