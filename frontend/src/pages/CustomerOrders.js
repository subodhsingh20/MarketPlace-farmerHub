import { useEffect, useState } from "react";
import FadeIn from "../components/FadeIn";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import { getUserOrders } from "../services/authService";

const formatCurrency = (value) => `Rs. ${Number(value || 0)}`;

const getTrackingState = (status) => {
  if (status === "completed") return { label: "Delivered", progress: "100%" };
  if (status === "confirmed") return { label: "Farmer confirmed", progress: "66%" };
  if (status === "cancelled") return { label: "Cancelled", progress: "100%" };
  return { label: "Awaiting confirmation", progress: "33%" };
};

function CustomerOrders() {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState("");

  const loadOrders = async () => {
    try {
      setError("");
      const response = await getUserOrders();
      setOrders(response.data.orders || []);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Failed to load your orders.");
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  useEffect(() => {
    if (!socket) return undefined;
    const handleOrderAlert = () => loadOrders();
    socket.on("order_alert", handleOrderAlert);
    return () => socket.off("order_alert", handleOrderAlert);
  }, [socket]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50">
      <FadeIn>
        <div className="responsive-shell">
          <div className="responsive-card mb-6 border border-gray-100 bg-white shadow-2xl">
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3 lg:items-center">
              <div className="lg:col-span-2">
                <span className="responsive-chip mb-5 inline-block bg-emerald-100 text-emerald-800">
                  Customer Orders
                </span>
                <h1 className="responsive-title mb-5 font-bold">
                  Track every order in one place, {user?.name}.
                </h1>
                <p className="responsive-copy max-w-2xl">
                  Your placed orders are saved here automatically, with live status updates and address details.
                </p>
              </div>
              <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 p-6 text-white">
                <h3 className="mb-6 text-lg font-semibold">Order Summary</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-emerald-100">Total Orders</span>
                    <span className="text-2xl font-bold">{orders.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-emerald-100">Completed</span>
                    <span className="text-2xl font-bold">
                      {orders.filter((order) => order.status === "completed").length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-emerald-100">Pending</span>
                    <span className="text-2xl font-bold">
                      {
                        orders.filter(
                          (order) => !["completed", "cancelled"].includes(order.status)
                        ).length
                      }
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Your Orders</h2>
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-800">
                {orders.length} total
              </span>
            </div>

            {error && (
              <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
                {error}
              </div>
            )}

            {!orders.length ? (
              <div className="py-12 text-center">
                <h3 className="text-lg font-semibold text-gray-900">No orders yet</h3>
                <p className="text-gray-600">Once you place an order, it will appear here.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => {
                  const trackingState = getTrackingState(order.status);
                  return (
                    <div key={order._id} className="rounded-xl border border-gray-200 bg-gray-50 p-5">
                      <div className="mb-4 flex flex-col md:flex-row md:items-center md:justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            Order #{String(order._id).slice(-6)}
                          </h3>
                          <span className="mt-2 inline-block rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
                            {order.status}
                          </span>
                        </div>
                        <p className="mt-4 text-2xl font-bold text-emerald-600 md:mt-0">
                          {formatCurrency(order.totalPrice)}
                        </p>
                      </div>
                      <div className="mb-4 rounded-xl border border-emerald-100 bg-white px-4 py-3">
                        <div className="flex items-center justify-between text-sm font-medium text-gray-700">
                          <span>Tracking</span>
                          <span>{trackingState.label}</span>
                        </div>
                        <div className="mt-3 h-2 rounded-full bg-emerald-100">
                          <div
                            className={`h-2 rounded-full ${
                              order.status === "cancelled" ? "bg-red-400" : "bg-emerald-500"
                            }`}
                            style={{ width: trackingState.progress }}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 gap-4 text-sm text-gray-600 md:grid-cols-2">
                        <div>
                          <span className="font-medium">Fulfillment:</span> {order.fulfillmentType}
                        </div>
                        <div>
                          <span className="font-medium">Payment:</span>{" "}
                          {order.paymentProvider || "online"} / {order.paymentStatus}
                        </div>
                        {order.shippingAddress && (
                          <div className="md:col-span-2">
                            <span className="font-medium">Address:</span> {order.shippingAddress.label},{" "}
                            {order.shippingAddress.street}, {order.shippingAddress.city},{" "}
                            {order.shippingAddress.state} - {order.shippingAddress.pincode}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </FadeIn>
    </div>
  );
}

export default CustomerOrders;
