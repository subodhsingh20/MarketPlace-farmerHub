import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import FadeIn from "../components/FadeIn";
import ProductImage, { normalizeImageUrl } from "../components/ProductImage";
import {
  formatAvailableStock,
  formatPriceWithUnit,
  formatQuantityWithUnit,
} from "../utils/productUnits";
import {
  addProduct,
  getChatConversations,
  getFarmerAnalytics,
  deleteProduct,
  getFarmerOrders,
  getProductsByFarmer,
  updateProduct,
} from "../services/authService";

const initialFormState = {
  name: "",
  price: "",
  quantity: "",
  unit: "kg",
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
  const [conversations, setConversations] = useState([]);
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
  const [formData, setFormData] = useState(initialFormState);
  const [editingProductId, setEditingProductId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const editFormRef = useRef(null);

  const orderHistory = orders.filter((order) =>
    ["completed", "cancelled"].includes(order.status)
  );

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
    if (status === "completed") {
      return "bg-green-100 text-green-800";
    }

    if (status === "cancelled") {
      return "bg-red-100 text-red-800";
    }

    if (status === "confirmed") {
      return "bg-blue-100 text-blue-800";
    }

    return "bg-yellow-100 text-yellow-800";
  };

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

        const chatResponse = await getChatConversations();
        setConversations(chatResponse.data.conversations || []);
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
      if (farmerId) {
        Promise.all([getFarmerOrders(), getFarmerAnalytics(), getChatConversations()])
          .then(([ordersResponse, analyticsResponse, chatResponse]) => {
            setOrders(ordersResponse.data.orders || []);
            setAnalytics(analyticsResponse.data.analytics || {});
            setConversations(chatResponse.data.conversations || []);
          })
          .catch(() => {});
      }
    };

    const handleChatAlert = (alert) => {
      getChatConversations()
        .then((response) => {
          setConversations(response.data.conversations || []);
        })
        .catch(() => {});
    };

    socket.on("order_alert", handleOrderAlert);
    socket.on("chat_message", handleChatAlert);

    return () => {
      socket.off("order_alert", handleOrderAlert);
      socket.off("chat_message", handleChatAlert);
    };
  }, [farmerId, socket]);

  useEffect(() => {
    if (!editingProductId || !editFormRef.current) {
      return;
    }

    editFormRef.current.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, [editingProductId]);

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
      unit: product.unit || "kg",
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
      unit: formData.unit,
      category: formData.category,
      imageUrl: normalizeImageUrl(formData.imageUrl),
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50">
      <FadeIn>
        <div className="responsive-shell">
          {/* Hero Section */}
          <FadeIn delay={0.1}>
            <div className="responsive-card mb-6 border border-gray-100 bg-white shadow-2xl">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
                <div className="lg:col-span-2">
                  <span className="responsive-chip mb-5 inline-block bg-emerald-100 text-emerald-800">Farmer Dashboard</span>
                  <h1 className="responsive-title mb-5 font-bold">
                    Run your storefront with more clarity.
                  </h1>
                  <p className="responsive-copy max-w-2xl">
                    Welcome {user?.name}. Manage listings, follow order flow, and keep your inventory and earnings in one place.
                  </p>
                </div>

                <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 p-6 text-white">
                  <h3 className="text-lg font-semibold mb-6">At a Glance</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-emerald-100">Lifetime Earnings</span>
                      <span className="text-2xl font-bold">Rs. {analytics.totalEarnings || 0}</span>
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

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            {/* Main Content */}
            <div className="xl:col-span-2 space-y-8">
              {/* Analytics Cards */}
              <FadeIn delay={0.2}>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100 p-4 sm:p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-200 sm:h-11 sm:w-11">
                        <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                        </svg>
                      </div>
                    </div>
                    <h3 className="mb-1 text-sm font-medium text-blue-800">Total Earnings</h3>
                    <p className="text-xl font-bold text-blue-900 sm:text-2xl">Rs. {analytics.totalEarnings || 0}</p>
                    <p className="text-xs text-blue-600 mt-1">All paid orders combined</p>
                  </div>

                  <div className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-100 p-4 sm:p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-200 sm:h-11 sm:w-11">
                        <svg className="h-5 w-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    </div>
                    <h3 className="mb-1 text-sm font-medium text-emerald-800">Completed Revenue</h3>
                    <p className="text-xl font-bold text-emerald-900 sm:text-2xl">Rs. {analytics.completedEarnings || 0}</p>
                    <p className="text-xs text-emerald-600 mt-1">Revenue from completed orders</p>
                  </div>

                  <div className="rounded-xl border border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100 p-4 sm:p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-200 sm:h-11 sm:w-11">
                        <svg className="h-5 w-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                      </div>
                    </div>
                    <h3 className="mb-1 text-sm font-medium text-purple-800">Quantity Sold</h3>
                    <p className="text-xl font-bold text-purple-900 sm:text-2xl">{analytics.totalItemsSold || 0}</p>
                    <p className="text-xs text-purple-600 mt-1">Combined kg and litre sold</p>
                  </div>

                  <div className="rounded-xl border border-orange-200 bg-gradient-to-br from-orange-50 to-orange-100 p-4 sm:p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-200 sm:h-11 sm:w-11">
                        <svg className="h-5 w-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    </div>
                    <h3 className="mb-1 text-sm font-medium text-orange-800">Pending Orders</h3>
                    <p className="text-xl font-bold text-orange-900 sm:text-2xl">{analytics.pendingOrders || 0}</p>
                    <p className="text-xs text-orange-600 mt-1">Orders awaiting action</p>
                  </div>
                </div>
              </FadeIn>

              {/* Add/Edit Product Form */}
              <FadeIn delay={0.4}>
                <div
                  ref={editFormRef}
                  className="rounded-2xl border border-gray-100 bg-white p-6 shadow-xl"
                >
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
                          Price (Rs. per unit)
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
                          Available Stock
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
                          Unit
                        </label>
                        <select
                          name="unit"
                          value={formData.unit}
                          onChange={handleChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-300 text-gray-900 bg-white"
                        >
                          <option value="kg">Kilogram (kg)</option>
                          <option value="litre">Litre</option>
                        </select>
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
                        type="text"
                        name="imageUrl"
                        placeholder="example.com/image.jpg"
                        value={formData.imageUrl}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-300 text-gray-900 placeholder-gray-500"
                      />
                      <p className="mt-2 text-sm text-gray-500">
                        Paste a direct image link. If you omit `https://`, the app will add it for you.
                      </p>
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
                            <ProductImage
                              src={formData.imageUrl}
                              alt={formData.name || "Product preview"}
                              productName={formData.name || "Product preview"}
                              className="w-full md:w-32 h-32 object-cover rounded-lg border border-gray-300"
                              fallbackClassName="w-full md:w-32 h-32 object-cover rounded-lg border border-gray-300 p-2"
                            />
                            <div className="flex-1 text-center md:text-left">
                              <h4 className="font-semibold text-gray-900">{formData.name || "Product Name"}</h4>
                              <p className="text-gray-600">
                                {formatPriceWithUnit(formData.price || 0, formData.unit)} • {formatAvailableStock(formData.quantity || 0, formData.unit)}
                              </p>
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

              {false && (
              <FadeIn delay={0.6}>
                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-xl">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">Order History</h2>
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-sm font-semibold rounded-full">
                      {orderHistory.length} saved
                    </span>
                  </div>

                  {!orderHistory.length ? (
                    <div className="text-center py-12">
                      <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">No order history yet</h3>
                      <p className="text-gray-600">Completed and cancelled orders will be saved here with their earning details.</p>
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
                                  <div className={`mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
                                    order.status === "completed" ? "bg-green-200" : "bg-red-200"
                                  }`}>
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
                                        <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${getStatusBadgeClass(order.status)}`}>
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
                                      {itemCount} total quantity across {order.products?.length || 0} product{order.products?.length === 1 ? "" : "s"}
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
                                      {item.productId?.name || "Product"} • {formatQuantityWithUnit(item.quantity, item.unit || item.productId?.unit)}
                                    </span>
                                  ))}
                                </div>
                              </div>

                              <div className="rounded-2xl border border-white/80 bg-white/80 px-5 py-4 text-left shadow-sm lg:min-w-[10rem] lg:text-right">
                                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                  Earning
                                </p>
                                <p className={`mt-2 text-3xl font-bold ${
                                  earning > 0 ? "text-green-600" : "text-red-500"
                                }`}>
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
              </FadeIn>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-8">
              <FadeIn delay={0.65}>
                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-xl">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">Chat Inbox</h2>
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-sm font-semibold rounded-full">
                      {conversations.length} chats
                    </span>
                  </div>

                  {conversations.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="inline-flex items-center justify-center w-12 h-12 bg-gray-100 rounded-full mb-3">
                        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-4l-4 4-4-4z" />
                        </svg>
                      </div>
                      <h3 className="text-sm font-semibold text-gray-900 mb-1">No customer messages yet</h3>
                      <p className="text-xs text-gray-600">New conversations will appear here automatically.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {conversations.map((conversation) => (
                        <Link
                          key={conversation.userId}
                          to={`/chat?user=${conversation.userId}&name=${encodeURIComponent(
                            conversation.name
                          )}`}
                          className="block rounded-xl border border-gray-200 bg-gray-50 px-4 py-4 transition-all duration-300 hover:border-emerald-200 hover:bg-emerald-50"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="font-semibold text-gray-900 truncate">{conversation.name}</p>
                              <p className="text-xs text-emerald-700 capitalize mt-1">{conversation.role || "user"}</p>
                              <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                                {conversation.lastMessage}
                              </p>
                            </div>
                            <span className="text-[11px] text-gray-400 whitespace-nowrap">
                              {new Date(conversation.timestamp).toLocaleString()}
                            </span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </FadeIn>

              {/* Products List */}
              <FadeIn delay={0.7}>
                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-xl">
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
                            <ProductImage
                              src={product.imageUrl}
                              alt={product.name}
                              productName={product.name}
                              className="w-16 h-16 object-cover rounded-lg border border-gray-300"
                              fallbackClassName="w-16 h-16 object-cover rounded-lg border border-gray-300 p-1"
                            />
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-gray-900 truncate">{product.name}</h3>
                              <p className="text-sm text-gray-600">
                                {formatPriceWithUnit(product.price, product)} • {formatAvailableStock(product.quantity, product)}
                              </p>
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
