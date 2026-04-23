import { useEffect, useState } from "react";
import FadeIn from "../components/FadeIn";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import {
  getFarmerAnalytics,
  getFarmerOrders,
  updateOrderStatus,
} from "../services/authService";
import { formatQuantityWithUnit } from "../utils/productUnits";

const getOrderEarning = (order) =>
  (order.products || []).reduce(
    (total, item) => total + Number(item.price || 0) * Number(item.quantity || 0),
    0
  );

const formatOrderAddress = (address) => {
  if (!address) {
    return "Address not provided";
  }

  const parts = [
    address.label,
    address.name,
    address.street,
    address.city,
    address.state,
    address.pincode,
  ].filter(Boolean);

  return parts.length ? parts.join(", ") : "Address not provided";
};

const getStatusBadgeClass = (status) => {
  if (status === "completed") return "border border-emerald-400/30 bg-emerald-500/15 text-emerald-100";
  if (status === "cancelled") return "border border-rose-400/30 bg-rose-500/15 text-rose-100";
  if (status === "confirmed") return "border border-sky-400/30 bg-sky-500/15 text-sky-100";
  return "border border-amber-400/30 bg-amber-500/15 text-amber-100";
};

function FarmerOrders() {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [orders, setOrders] = useState([]);
  const [analytics, setAnalytics] = useState({});
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const activeOrders = orders.filter(
    (order) => !["completed", "cancelled"].includes(order.status)
  );
  const orderHistory = orders.filter((order) =>
    ["completed", "cancelled"].includes(order.status)
  );

  const loadOrdersPage = async () => {
    try {
      setError("");
      const [ordersResponse, analyticsResponse] = await Promise.all([
        getFarmerOrders(),
        getFarmerAnalytics(),
      ]);
      setOrders(ordersResponse.data.orders || []);
      setAnalytics(analyticsResponse.data.analytics || {});
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Failed to load your orders.");
    }
  };

  useEffect(() => {
    loadOrdersPage();
  }, []);

  useEffect(() => {
    if (!socket) return undefined;
    const handleOrderAlert = () => loadOrdersPage();
    socket.on("order_alert", handleOrderAlert);
    return () => socket.off("order_alert", handleOrderAlert);
  }, [socket]);

  const handleOrderStatusChange = async (orderId, status) => {
    try {
      setError("");
      const response = await updateOrderStatus(orderId, status);
      setOrders((current) =>
        current.map((order) => (order._id === orderId ? response.data.order : order))
      );
      const analyticsResponse = await getFarmerAnalytics();
      setAnalytics(analyticsResponse.data.analytics || {});
      setSuccessMessage(
        status === "completed"
          ? "Order completed and saved in order history."
          : status === "cancelled"
            ? "Order cancelled and saved in order history."
            : "Order status updated successfully."
      );
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Failed to update order status.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-emerald-950 to-slate-900 text-slate-100">
      <FadeIn>
        <div className="responsive-shell">
          <div className="premium-panel mb-6 overflow-hidden p-6 shadow-[0_24px_70px_rgba(15,23,42,0.16)]">
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3 lg:items-center">
              <div className="lg:col-span-2">
                <span className="responsive-chip mb-5 inline-block border border-emerald-400/20 bg-emerald-400/15 text-emerald-100">
                  Farmer Orders
                </span>
                <h1 className="responsive-title mb-5 font-bold !text-black">
                  Manage customer orders with confidence, {user?.name}.
                </h1>
                <p className="responsive-copy max-w-2xl !text-slate-300">
                  Every received order is saved here, including active requests and completed history.
                </p>
              </div>
              <div className="rounded-[1.75rem] border border-white/10 bg-gradient-to-br from-emerald-500 to-green-600 p-6 text-white shadow-[0_20px_60px_rgba(16,185,129,0.28)]">
                <h3 className="mb-6 text-lg font-semibold">Orders Snapshot</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-emerald-100">Total Orders</span>
                    <span className="text-2xl font-bold">{orders.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-emerald-100">Pending Orders</span>
                    <span className="text-2xl font-bold">{analytics.pendingOrders || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-emerald-100">Completed Orders</span>
                    <span className="text-2xl font-bold">{analytics.completedOrders || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {(error || successMessage) && (
            <div className="mb-6 space-y-3">
              {error && (
                <div className="rounded-xl border border-rose-400/20 bg-rose-500/10 p-4 text-sm font-medium text-rose-100">
                  {error}
                </div>
              )}
              {successMessage && (
                <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-4 text-sm font-medium text-emerald-100">
                  {successMessage}
                </div>
              )}
            </div>
          )}

          <div className="space-y-8">
            <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/72 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.28)] backdrop-blur-xl">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-2xl font-bold !text-white">Active Orders</h2>
                <span className="rounded-full border border-emerald-400/20 bg-emerald-400/15 px-3 py-1 text-sm font-semibold text-emerald-100">
                  {activeOrders.length} active
                </span>
              </div>

              {activeOrders.length === 0 ? (
                <div className="py-12 text-center">
                  <h3 className="text-lg font-semibold text-white">No active orders right now</h3>
                  <p className="text-slate-300">
                    New customer orders will appear here, and completed or cancelled ones will move into order history.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {activeOrders.map((order) => (
                    <div
                      key={order._id}
                      className="rounded-2xl border border-white/10 bg-white/6 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.16)] backdrop-blur"
                    >
                      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                            <div>
                              <h3 className="text-lg font-semibold text-white">
                                Order #{String(order._id).slice(-6)}
                              </h3>
                              <p className="mt-1 text-sm text-slate-300">
                                Customer: {order.userId?.name || "Customer"}
                                {order.userId?.phone ? ` | ${order.userId.phone}` : ""}
                              </p>
                              <p className="mt-1 text-sm text-slate-300">
                                {order.products?.length || 0} product
                                {order.products?.length === 1 ? "" : "s"} in this order
                              </p>
                              <p className="mt-1 text-xs text-slate-400">
                                {new Date(order.createdAt).toLocaleString()}
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <span
                                className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${getStatusBadgeClass(order.status)}`}
                              >
                                {order.status}
                              </span>
                              <span className="rounded-full border border-white/10 bg-white/8 px-3 py-1 text-xs font-semibold capitalize text-slate-100">
                                Payment {order.paymentStatus}
                              </span>
                              <span className="rounded-full border border-amber-300/20 bg-amber-400/10 px-3 py-1 text-xs font-semibold capitalize text-amber-100">
                                {order.fulfillmentType || "delivery"}
                              </span>
                            </div>
                          </div>

                          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                            <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                Delivery Address
                              </p>
                              <p className="mt-2 text-sm leading-6 text-slate-200">
                                {formatOrderAddress(order.shippingAddress)}
                              </p>
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                Order Snapshot
                              </p>
                              <p className="mt-2 text-sm text-slate-200">
                                Customer total: Rs. {order.totalPrice || 0}
                              </p>
                              <p className="mt-1 text-sm text-slate-200">
                                Your earning: Rs. {getOrderEarning(order)}
                              </p>
                            </div>
                          </div>

                          <div className="mt-4 flex flex-wrap gap-2">
                            {(order.products || []).map((item) => (
                              <span
                                key={`${order._id}-${item.productId?._id || item.productId}`}
                                className="rounded-full border border-white/10 bg-white/8 px-3 py-1.5 text-xs font-medium text-slate-100 shadow-sm"
                              >
                                {item.productId?.name || "Product"} |{" "}
                                {formatQuantityWithUnit(
                                  item.quantity,
                                  item.unit || item.productId?.unit
                                )}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-slate-950/40 px-5 py-4 shadow-sm lg:min-w-[12rem]">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                            Earning
                          </p>
                          <p className="mt-2 text-3xl font-bold text-emerald-300">
                            Rs. {getOrderEarning(order)}
                          </p>
                          <div className="mt-4 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => handleOrderStatusChange(order._id, "confirmed")}
                              className="rounded-lg bg-sky-500 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-sky-600"
                            >
                              Confirm
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOrderStatusChange(order._id, "completed")}
                              className="rounded-lg bg-emerald-500 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-emerald-600"
                            >
                              Complete
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOrderStatusChange(order._id, "cancelled")}
                              className="rounded-lg bg-rose-500 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-rose-600"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/72 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.28)] backdrop-blur-xl">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-2xl font-bold !text-white">Order History</h2>
                <span className="rounded-full border border-emerald-400/20 bg-emerald-400/15 px-3 py-1 text-sm font-semibold text-emerald-100">
                  {orderHistory.length} saved
                </span>
              </div>

              {!orderHistory.length ? (
                <div className="py-12 text-center">
                  <h3 className="text-lg font-semibold text-white">No order history yet</h3>
                  <p className="text-slate-300">
                    Completed and cancelled orders will be saved here with their earning details.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {orderHistory.map((order) => {
                    const earning = order.status === "completed" ? getOrderEarning(order) : 0;
                    const itemCount = (order.products || []).reduce(
                      (total, item) => total + Number(item.quantity || 0),
                      0
                    );
                    const historyTone =
                      order.status === "completed"
                        ? "border-emerald-400/20 bg-gradient-to-r from-emerald-500/10 to-teal-500/10"
                        : "border-rose-400/20 bg-gradient-to-r from-rose-500/10 to-red-500/10";

                    return (
                      <div key={order._id} className={`rounded-2xl border p-5 shadow-[0_18px_50px_rgba(15,23,42,0.16)] backdrop-blur ${historyTone}`}>
                        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start gap-3">
                              <div
                                className={`mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
                                  order.status === "completed" ? "bg-emerald-400/20" : "bg-rose-400/20"
                                }`}
                              >
                                <svg
                                  className={`h-5 w-5 ${
                                    order.status === "completed" ? "text-emerald-200" : "text-rose-200"
                                  }`}
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d={
                                      order.status === "completed"
                                        ? "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                        : "M6 18L18 6M6 6l12 12"
                                    }
                                  />
                                </svg>
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                  <div>
                                    <h3 className="text-lg font-semibold text-white">
                                      Order #{String(order._id).slice(-6)}
                                    </h3>
                                    <p className="mt-1 text-sm text-slate-300">
                                      {new Date(order.updatedAt || order.createdAt).toLocaleString()}
                                    </p>
                                    <p className="mt-1 text-sm text-slate-200">
                                      Customer: {order.userId?.name || "Customer"}
                                      {order.userId?.phone ? ` | ${order.userId.phone}` : ""}
                                    </p>
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${getStatusBadgeClass(order.status)}`}>
                                      {order.status}
                                    </span>
                                    <span className="rounded-full border border-white/10 bg-white/8 px-3 py-1 text-xs font-semibold capitalize text-slate-100">
                                      Payment {order.paymentStatus}
                                    </span>
                                    <span className="rounded-full border border-amber-300/20 bg-amber-400/10 px-3 py-1 text-xs font-semibold capitalize text-amber-100">
                                      {order.fulfillmentType || "delivery"}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                              <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                  Delivery Address
                                </p>
                                <p className="mt-2 text-sm leading-6 text-slate-200">
                                  {formatOrderAddress(order.shippingAddress)}
                                </p>
                              </div>
                              <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                  Order Snapshot
                                </p>
                                <p className="mt-2 text-sm text-slate-200">
                                  {itemCount} total quantity across {order.products?.length || 0} product
                                  {order.products?.length === 1 ? "" : "s"}
                                </p>
                                <p className="mt-1 text-sm text-slate-200">
                                  Customer total: Rs. {order.totalPrice || 0}
                                </p>
                                <p className="mt-1 text-sm text-slate-200">
                                  Your earning: Rs. {earning}
                                </p>
                              </div>
                            </div>

                            <div className="mt-4 flex flex-wrap gap-2">
                              {(order.products || []).map((item) => (
                                <span
                                  key={`${order._id}-${item.productId?._id || item.productId}`}
                                  className="rounded-full border border-white/10 bg-white/8 px-3 py-1.5 text-xs font-medium text-slate-100 shadow-sm"
                                >
                                  {item.productId?.name || "Product"} |{" "}
                                  {formatQuantityWithUnit(
                                    item.quantity,
                                    item.unit || item.productId?.unit
                                  )}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div className="rounded-2xl border border-white/10 bg-slate-950/40 px-5 py-4 text-left shadow-sm lg:min-w-[10rem] lg:text-right">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                              Earning
                            </p>
                            <p className={`mt-2 text-3xl font-bold ${earning > 0 ? "text-emerald-300" : "text-rose-300"}`}>
                              Rs. {earning}
                            </p>
                            <p className="mt-2 text-xs text-slate-400">
                              {order.status === "completed"
                                ? "Credited from completed order"
                                : "No earning on cancelled order"}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </FadeIn>
    </div>
  );
}

export default FarmerOrders;
