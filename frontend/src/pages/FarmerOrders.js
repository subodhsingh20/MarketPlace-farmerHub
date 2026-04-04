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
  if (status === "completed") return "bg-green-100 text-green-800";
  if (status === "cancelled") return "bg-red-100 text-red-800";
  if (status === "confirmed") return "bg-blue-100 text-blue-800";
  return "bg-yellow-100 text-yellow-800";
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
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50">
      <FadeIn>
        <div className="responsive-shell">
          <div className="responsive-card mb-6 border border-gray-100 bg-white shadow-2xl">
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3 lg:items-center">
              <div className="lg:col-span-2">
                <span className="responsive-chip mb-5 inline-block bg-emerald-100 text-emerald-800">
                  Farmer Orders
                </span>
                <h1 className="responsive-title mb-5 font-bold">
                  Manage customer orders with confidence, {user?.name}.
                </h1>
                <p className="responsive-copy max-w-2xl">
                  Every received order is saved here, including active requests and completed history.
                </p>
              </div>
              <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 p-6 text-white">
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
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
                  {error}
                </div>
              )}
              {successMessage && (
                <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-medium text-green-700">
                  {successMessage}
                </div>
              )}
            </div>
          )}

          <div className="space-y-8">
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-xl">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Active Orders</h2>
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-800">
                  {activeOrders.length} active
                </span>
              </div>

              {activeOrders.length === 0 ? (
                <div className="py-12 text-center">
                  <h3 className="text-lg font-semibold text-gray-900">No active orders right now</h3>
                  <p className="text-gray-600">
                    New customer orders will appear here, and completed or cancelled ones will move into order history.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {activeOrders.map((order) => (
                    <div
                      key={order._id}
                      className="rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-5"
                    >
                      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900">
                                Order #{String(order._id).slice(-6)}
                              </h3>
                              <p className="mt-1 text-sm text-gray-600">
                                Customer: {order.userId?.name || "Customer"}
                                {order.userId?.phone ? ` | ${order.userId.phone}` : ""}
                              </p>
                              <p className="mt-1 text-sm text-gray-600">
                                {order.products?.length || 0} product
                                {order.products?.length === 1 ? "" : "s"} in this order
                              </p>
                              <p className="mt-1 text-xs text-gray-500">
                                {new Date(order.createdAt).toLocaleString()}
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <span
                                className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${getStatusBadgeClass(
                                  order.status
                                )}`}
                              >
                                {order.status}
                              </span>
                              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold capitalize text-slate-700">
                                Payment {order.paymentStatus}
                              </span>
                              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold capitalize text-amber-800">
                                {order.fulfillmentType || "delivery"}
                              </span>
                            </div>
                          </div>

                          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                            <div className="rounded-xl border border-white/70 bg-white/70 p-4">
                              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                Delivery Address
                              </p>
                              <p className="mt-2 text-sm leading-6 text-gray-700">
                                {formatOrderAddress(order.shippingAddress)}
                              </p>
                            </div>
                            <div className="rounded-xl border border-white/70 bg-white/70 p-4">
                              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                Order Snapshot
                              </p>
                              <p className="mt-2 text-sm text-gray-700">
                                Customer total: Rs. {order.totalPrice || 0}
                              </p>
                              <p className="mt-1 text-sm text-gray-700">
                                Your earning: Rs. {getOrderEarning(order)}
                              </p>
                            </div>
                          </div>

                          <div className="mt-4 flex flex-wrap gap-2">
                            {(order.products || []).map((item) => (
                              <span
                                key={`${order._id}-${item.productId?._id || item.productId}`}
                                className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm"
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

                        <div className="rounded-2xl border border-white/80 bg-white/80 px-5 py-4 shadow-sm lg:min-w-[12rem]">
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Earning
                          </p>
                          <p className="mt-2 text-3xl font-bold text-emerald-600">
                            Rs. {getOrderEarning(order)}
                          </p>
                          <div className="mt-4 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => handleOrderStatusChange(order._id, "confirmed")}
                              className="rounded-lg bg-blue-500 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-blue-600"
                            >
                              Confirm
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOrderStatusChange(order._id, "completed")}
                              className="rounded-lg bg-green-500 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-green-600"
                            >
                              Complete
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOrderStatusChange(order._id, "cancelled")}
                              className="rounded-lg bg-red-500 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-red-600"
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

            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-xl">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Order History</h2>
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-800">
                  {orderHistory.length} saved
                </span>
              </div>

              {!orderHistory.length ? (
                <div className="py-12 text-center">
                  <h3 className="text-lg font-semibold text-gray-900">No order history yet</h3>
                  <p className="text-gray-600">
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
                        ? "border-green-200 bg-gradient-to-r from-green-50 to-emerald-50"
                        : "border-red-200 bg-gradient-to-r from-red-50 to-rose-50";

                    return (
                      <div key={order._id} className={`rounded-2xl border p-5 shadow-sm ${historyTone}`}>
                        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start gap-3">
                              <div
                                className={`mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
                                  order.status === "completed" ? "bg-green-200" : "bg-red-200"
                                }`}
                              >
                                <svg
                                  className={`h-5 w-5 ${
                                    order.status === "completed" ? "text-green-600" : "text-red-600"
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
                                    <h3 className="text-lg font-semibold text-gray-900">
                                      Order #{String(order._id).slice(-6)}
                                    </h3>
                                    <p className="mt-1 text-sm text-gray-600">
                                      {new Date(order.updatedAt || order.createdAt).toLocaleString()}
                                    </p>
                                    <p className="mt-1 text-sm text-gray-700">
                                      Customer: {order.userId?.name || "Customer"}
                                      {order.userId?.phone ? ` | ${order.userId.phone}` : ""}
                                    </p>
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    <span
                                      className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${getStatusBadgeClass(
                                        order.status
                                      )}`}
                                    >
                                      {order.status}
                                    </span>
                                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold capitalize text-slate-700">
                                      Payment {order.paymentStatus}
                                    </span>
                                    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold capitalize text-amber-800">
                                      {order.fulfillmentType || "delivery"}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                              <div className="rounded-xl border border-white/70 bg-white/70 p-4">
                                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                  Delivery Address
                                </p>
                                <p className="mt-2 text-sm leading-6 text-gray-700">
                                  {formatOrderAddress(order.shippingAddress)}
                                </p>
                              </div>
                              <div className="rounded-xl border border-white/70 bg-white/70 p-4">
                                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                  Order Snapshot
                                </p>
                                <p className="mt-2 text-sm text-gray-700">
                                  {itemCount} total quantity across {order.products?.length || 0} product
                                  {order.products?.length === 1 ? "" : "s"}
                                </p>
                                <p className="mt-1 text-sm text-gray-700">
                                  Customer total: Rs. {order.totalPrice || 0}
                                </p>
                                <p className="mt-1 text-sm text-gray-700">
                                  Your earning: Rs. {earning}
                                </p>
                              </div>
                            </div>

                            <div className="mt-4 flex flex-wrap gap-2">
                              {(order.products || []).map((item) => (
                                <span
                                  key={`${order._id}-${item.productId?._id || item.productId}`}
                                  className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm"
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

                          <div className="rounded-2xl border border-white/80 bg-white/80 px-5 py-4 text-left shadow-sm lg:min-w-[10rem] lg:text-right">
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                              Earning
                            </p>
                            <p
                              className={`mt-2 text-3xl font-bold ${
                                earning > 0 ? "text-green-600" : "text-red-500"
                              }`}
                            >
                              Rs. {earning}
                            </p>
                            <p className="mt-2 text-xs text-gray-500">
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
