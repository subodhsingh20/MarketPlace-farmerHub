import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import FadeIn from "../components/FadeIn";
import {
  addProduct,
  getFarmerAnalytics,
  deleteProduct,
  getFarmerOrders,
  getProductsByFarmer,
  updateOrderStatus,
  updateProduct,
} from "../services/authService";

const initialFormState = {
  name: "",
  price: "",
  quantity: "",
  category: "vegetable",
  imageUrl: "",
  latitude: "",
  longitude: "",
};

function FarmerDashboard() {
  const { user } = useAuth();
  const { socket } = useSocket();
  const farmerId = user?.id || user?._id;
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [analytics, setAnalytics] = useState({
    totalEarnings: 0,
    completedEarnings: 0,
    totalItemsSold: 0,
    pendingOrders: 0,
    completedOrders: 0,
    cancelledOrders: 0,
    totalOrders: 0,
    recentEarnings: [],
  });
  const [alerts, setAlerts] = useState([]);
  const [formData, setFormData] = useState(initialFormState);
  const [editingProductId, setEditingProductId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    if (!farmerId) {
      return;
    }

    const loadDashboard = async () => {
      try {
        setIsLoading(true);
        setError("");
        const [productsResponse, ordersResponse, analyticsResponse] = await Promise.all([
          getProductsByFarmer(farmerId),
          getFarmerOrders(),
          getFarmerAnalytics(),
        ]);
        setProducts(productsResponse.data.products || []);
        setOrders(ordersResponse.data.orders || []);
        setAnalytics(analyticsResponse.data.analytics || {});
      } catch (requestError) {
        setError(
          requestError.response?.data?.message || "Failed to load your dashboard."
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboard();
  }, [farmerId]);

  useEffect(() => {
    if (!socket) {
      return undefined;
    }

    const handleOrderAlert = (alert) => {
      setAlerts((current) => [alert, ...current].slice(0, 6));
      if (farmerId) {
        Promise.all([getFarmerOrders(), getFarmerAnalytics()])
          .then(([ordersResponse, analyticsResponse]) => {
            setOrders(ordersResponse.data.orders || []);
            setAnalytics(analyticsResponse.data.analytics || {});
          })
          .catch(() => {});
      }
    };

    socket.on("order_alert", handleOrderAlert);

    return () => {
      socket.off("order_alert", handleOrderAlert);
    };
  }, [farmerId, socket]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const resetForm = () => {
    setFormData(initialFormState);
    setEditingProductId(null);
  };

  const handleEdit = (product) => {
    setEditingProductId(product._id);
    setSuccessMessage("");
    setError("");
    setFormData({
      name: product.name,
      price: String(product.price),
      quantity: String(product.quantity),
      category: product.category,
      imageUrl: product.imageUrl,
      latitude: String(product.location?.latitude ?? ""),
      longitude: String(product.location?.longitude ?? ""),
    });
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      return;
    }

    setIsFetchingLocation(true);
    setError("");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData((current) => ({
          ...current,
          latitude: String(position.coords.latitude),
          longitude: String(position.coords.longitude),
        }));
        setSuccessMessage("Current location captured for this product.");
        setIsFetchingLocation(false);
      },
      (locationError) => {
        setError(locationError.message || "Unable to fetch your current location.");
        setIsFetchingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
      }
    );
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");
    setSuccessMessage("");

    const payload = {
      name: formData.name,
      price: Number(formData.price),
      quantity: Number(formData.quantity),
      category: formData.category,
      imageUrl: formData.imageUrl,
      location: {
        latitude: Number(formData.latitude),
        longitude: Number(formData.longitude),
      },
    };

    try {
      if (editingProductId) {
        const response = await updateProduct(editingProductId, payload);
        setProducts((current) =>
          current.map((product) =>
            product._id === editingProductId ? response.data.product : product
          )
        );
        setSuccessMessage("Product updated successfully.");
      } else {
        const response = await addProduct(payload);
        setProducts((current) => [response.data.product, ...current]);
        setSuccessMessage("Product added successfully.");
      }

      resetForm();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Failed to save product.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (productId) => {
    try {
      setError("");
      setSuccessMessage("");
      await deleteProduct(productId);
      setProducts((current) => current.filter((product) => product._id !== productId));

      if (editingProductId === productId) {
        resetForm();
      }

      setSuccessMessage("Product deleted successfully.");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Failed to delete product.");
    }
  };

  const handleOrderStatusChange = async (orderId, status) => {
    try {
      const response = await updateOrderStatus(orderId, status);
      setOrders((current) =>
        current.map((order) => (order._id === orderId ? response.data.order : order))
      );
      const analyticsResponse = await getFarmerAnalytics();
      setAnalytics(analyticsResponse.data.analytics || {});
    } catch (requestError) {
      setError(
        requestError.response?.data?.message || "Failed to update order status."
      );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50">
      <FadeIn>
        <div className="max-w-7xl mx-auto px-4 py-8 lg:px-8">
          {/* Hero Section */}
          <FadeIn delay={0.1}>
            <div className="bg-white rounded-2xl lg:rounded-3xl p-8 lg:p-12 mb-8 shadow-2xl border border-gray-100">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
                <div className="lg:col-span-2">
                  <span className="inline-block px-4 py-2 bg-emerald-100 text-emerald-800 text-sm font-semibold rounded-full mb-6">Farmer Dashboard</span>
                  <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
                    Run your storefront with more clarity.
                  </h1>
                  <p className="text-xl text-gray-600 leading-relaxed max-w-2xl">
                    Welcome {user?.name}. Manage listings, follow order flow, and keep your inventory and earnings in one place.
                  </p>
                </div>

                <div className="bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl p-8 text-white">
                  <h3 className="text-lg font-semibold mb-6">At a Glance</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-emerald-100">Lifetime Earnings</span>
                      <span className="text-2xl font-bold">₹{analytics.totalEarnings || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-emerald-100">Products Listed</span>
                      <span className="text-2xl font-bold">{products.length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-emerald-100">Orders Received</span>
                      <span className="text-2xl font-bold">{orders.length}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </FadeIn>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="xl:col-span-2 space-y-8">
              {/* Analytics Cards */}
              <FadeIn delay={0.2}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 bg-blue-200 rounded-full flex items-center justify-center">
                        <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                        </svg>
                      </div>
                    </div>
                    <h3 className="text-sm font-medium text-blue-800 mb-1">Total Earnings</h3>
                    <p className="text-2xl font-bold text-blue-900">₹{analytics.totalEarnings || 0}</p>
                    <p className="text-xs text-blue-600 mt-1">All paid orders combined</p>
                  </div>

                  <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-6 border border-emerald-200">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 bg-emerald-200 rounded-full flex items-center justify-center">
                        <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    </div>
                    <h3 className="text-sm font-medium text-emerald-800 mb-1">Completed Revenue</h3>
                    <p className="text-2xl font-bold text-emerald-900">₹{analytics.completedEarnings || 0}</p>
                    <p className="text-xs text-emerald-600 mt-1">Revenue from completed orders</p>
                  </div>

                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 bg-purple-200 rounded-full flex items-center justify-center">
                        <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                      </div>
                    </div>
                    <h3 className="text-sm font-medium text-purple-800 mb-1">Items Sold</h3>
                    <p className="text-2xl font-bold text-purple-900">{analytics.totalItemsSold || 0}</p>
                    <p className="text-xs text-purple-600 mt-1">Total units sold</p>
                  </div>

                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 border border-orange-200">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 bg-orange-200 rounded-full flex items-center justify-center">
                        <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    </div>
                    <h3 className="text-sm font-medium text-orange-800 mb-1">Pending Orders</h3>
                    <p className="text-2xl font-bold text-orange-900">{analytics.pendingOrders || 0}</p>
                    <p className="text-xs text-orange-600 mt-1">Orders awaiting action</p>
                  </div>
                </div>
              </FadeIn>

              {/* Alerts Section */}
              <FadeIn delay={0.3}>
                <div className="bg-white rounded-2xl p-8 shadow-xl border border-gray-100">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">Live Alerts</h2>
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
                      <p className="text-gray-600">New orders and updates will appear here.</p>
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

              {/* Add/Edit Product Form */}
              <FadeIn delay={0.4}>
                <div className="bg-white rounded-2xl p-8 shadow-xl border border-gray-100">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">
                      {editingProductId ? "Edit Product" : "Add New Product"}
                    </h2>
                    {editingProductId && (
                      <button
                        type="button"
                        onClick={resetForm}
                        className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors"
                      >
                        Cancel Edit
                      </button>
                    )}
                  </div>

                  <form className="space-y-6" onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Product Name
                        </label>
                        <input
                          type="text"
                          name="name"
                          placeholder="e.g., Fresh Tomatoes"
                          value={formData.name}
                          onChange={handleChange}
                          required
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-300 text-gray-900 placeholder-gray-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Price (₹)
                        </label>
                        <input
                          type="number"
                          name="price"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={formData.price}
                          onChange={handleChange}
                          required
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-300 text-gray-900 placeholder-gray-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Quantity
                        </label>
                        <input
                          type="number"
                          name="quantity"
                          min="0"
                          placeholder="Available stock"
                          value={formData.quantity}
                          onChange={handleChange}
                          required
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-300 text-gray-900 placeholder-gray-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Category
                        </label>
                        <select
                          name="category"
                          value={formData.category}
                          onChange={handleChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-300 text-gray-900 bg-white"
                        >
                          <option value="vegetable">Vegetable</option>
                          <option value="pulses">Pulses</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Image URL
                      </label>
                      <input
                        type="url"
                        name="imageUrl"
                        placeholder="https://example.com/image.jpg"
                        value={formData.imageUrl}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-300 text-gray-900 placeholder-gray-500"
                      />
                    </div>

                    {/* Location Section */}
                    <FadeIn delay={0.1}>
                      <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl p-6 border border-emerald-200">
                        <div className="flex items-center mb-4">
                          <svg className="w-5 h-5 text-emerald-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <h3 className="text-lg font-semibold text-gray-900">Product Location</h3>
                        </div>

                        <p className="text-gray-600 text-sm mb-4">
                          Set the location where customers can pick up this product.
                        </p>

                        <button
                          type="button"
                          onClick={handleUseCurrentLocation}
                          disabled={isFetchingLocation}
                          className="w-full mb-4 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 hover:shadow-lg shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                        >
                          {isFetchingLocation ? (
                            <div className="flex items-center justify-center">
                              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Getting your location...
                            </div>
                          ) : (
                            <div className="flex items-center justify-center">
                              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              Use Current Location
                            </div>
                          )}
                        </button>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Latitude
                            </label>
                            <input
                              type="number"
                              name="latitude"
                              step="any"
                              placeholder="28.6139"
                              value={formData.latitude}
                              onChange={handleChange}
                              required
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-300"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Longitude
                            </label>
                            <input
                              type="number"
                              name="longitude"
                              step="any"
                              placeholder="77.2090"
                              value={formData.longitude}
                              onChange={handleChange}
                              required
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-300"
                            />
                          </div>
                        </div>
                      </div>
                    </FadeIn>

                    {/* Product Preview */}
                    {formData.imageUrl && (
                      <FadeIn delay={0.1}>
                        <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                          <h3 className="text-lg font-semibold text-gray-900 mb-4">Product Preview</h3>
                          <div className="flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-6">
                            <img
                              src={formData.imageUrl}
                              alt={formData.name || "Product preview"}
                              className="w-full md:w-32 h-32 object-cover rounded-lg border border-gray-300"
                            />
                            <div className="flex-1 text-center md:text-left">
                              <h4 className="font-semibold text-gray-900">{formData.name || "Product Name"}</h4>
                              <p className="text-gray-600">₹{formData.price || "0.00"} • {formData.quantity || "0"} available</p>
                              <p className="text-sm text-gray-500 capitalize">{formData.category}</p>
                            </div>
                          </div>
                        </div>
                      </FadeIn>
                    )}

                    {error && (
                      <FadeIn delay={0.1}>
                        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                          <div className="flex items-center">
                            <svg className="w-5 h-5 text-red-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <p className="text-red-700 font-medium">{error}</p>
                          </div>
                        </div>
                      </FadeIn>
                    )}

                    {successMessage && (
                      <FadeIn delay={0.1}>
                        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                          <div className="flex items-center">
                            <svg className="w-5 h-5 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <p className="text-green-700 font-medium">{successMessage}</p>
                          </div>
                        </div>
                      </FadeIn>
                    )}

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all duration-300 transform hover:scale-105 hover:shadow-2xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    >
                      {isSubmitting ? (
                        <div className="flex items-center justify-center">
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          {editingProductId ? "Updating Product..." : "Adding Product..."}
                        </div>
                      ) : (
                        editingProductId ? "Update Product" : "Add Product"
                      )}
                    </button>
                  </form>
                </div>
              </FadeIn>

              {/* Orders Section */}
              <FadeIn delay={0.5}>
                <div className="bg-white rounded-2xl p-8 shadow-xl border border-gray-100">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">Received Orders</h2>
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
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">No orders received yet</h3>
                      <p className="text-gray-600">Orders will appear here once customers place them.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {orders.map((order) => (
                        <div key={order._id} className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900">Order #{String(order._id).slice(-6)}</h3>
                              <span className={`inline-block px-3 py-1 text-xs font-semibold rounded-full mt-2 ${
                                order.status === 'completed' ? 'bg-green-100 text-green-800' :
                                order.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                                order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                {order.status}
                              </span>
                            </div>
                            <div className="text-right mt-4 md:mt-0">
                              <p className="text-2xl font-bold text-emerald-600">₹{order.totalPrice}</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 mb-4">
                            <div>
                              <span className="font-medium">Customer:</span> {order.userId?.name}
                            </div>
                            <div>
                              <span className="font-medium">Payment:</span> {order.paymentStatus}
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => handleOrderStatusChange(order._id, "confirmed")}
                              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors"
                            >
                              Confirm
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOrderStatusChange(order._id, "completed")}
                              className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-lg transition-colors"
                            >
                              Complete
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOrderStatusChange(order._id, "cancelled")}
                              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </FadeIn>

              {/* Recent Earnings */}
              <FadeIn delay={0.6}>
                <div className="bg-white rounded-2xl p-8 shadow-xl border border-gray-100">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">Recent Earnings</h2>
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-sm font-semibold rounded-full">
                      {analytics.recentEarnings?.length || 0} entries
                    </span>
                  </div>

                  {!analytics.recentEarnings?.length ? (
                    <div className="text-center py-12">
                      <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">No earnings entries yet</h3>
                      <p className="text-gray-600">Completed orders will appear here with earnings details.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {analytics.recentEarnings.map((entry) => (
                        <div key={entry.orderId} className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-green-200 rounded-full flex items-center justify-center">
                                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                                </svg>
                              </div>
                              <div>
                                <h3 className="font-semibold text-gray-900">Order #{String(entry.orderId).slice(-6)}</h3>
                                <p className="text-sm text-gray-600">
                                  {new Date(entry.createdAt).toLocaleDateString()} • {entry.status}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-bold text-green-600">₹{entry.amount}</p>
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
              {/* Products List */}
              <FadeIn delay={0.7}>
                <div className="bg-white rounded-2xl p-8 shadow-xl border border-gray-100">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">Your Products</h2>
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-sm font-semibold rounded-full">
                      {products.length} listed
                    </span>
                  </div>

                  {isLoading ? (
                    <div className="text-center py-12">
                      <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                        <svg className="w-8 h-8 text-gray-400 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Loading products...</h3>
                    </div>
                  ) : products.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">No products listed yet</h3>
                      <p className="text-gray-600">Add your first product using the form above.</p>
                    </div>
                  ) : (
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                      {products.map((product) => (
                        <div key={product._id} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                          <div className="flex items-center space-x-4">
                            <img
                              src={product.imageUrl}
                              alt={product.name}
                              className="w-16 h-16 object-cover rounded-lg border border-gray-300"
                            />
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-gray-900 truncate">{product.name}</h3>
                              <p className="text-sm text-gray-600">₹{product.price} • {product.quantity} available</p>
                              <p className="text-xs text-gray-500 capitalize">{product.category}</p>
                            </div>
                            <div className="flex space-x-2">
                              <button
                                type="button"
                                onClick={() => handleEdit(product)}
                                className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                                title="Edit product"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(product._id)}
                                className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                                title="Delete product"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </FadeIn>
            </div>
          </div>
        </div>
      </FadeIn>
    </div>
  );
}

export default FarmerDashboard;
