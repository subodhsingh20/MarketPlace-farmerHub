import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import ProductMap from "../components/ProductMap";
import FadeIn from "../components/FadeIn";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import {
  getAllProducts,
  getNearbyProducts,
  getProductsByFarmer,
  rateFarmer,
  rateProduct,
} from "../services/authService";

const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || "";

function ProductListing() {
  const { user } = useAuth();
  const { addToCart, cartItems } = useCart();
  const isCustomer = user?.role === "customer";
  const isFarmer = user?.role === "farmer";
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [locationError, setLocationError] = useState("");
  const [selectedFarmerId, setSelectedFarmerId] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [ratingState, setRatingState] = useState({});

  useEffect(() => {
    if (isFarmer && user?.id) {
      const loadFarmerProducts = async () => {
        try {
          setIsLoading(true);
          setError("");
          const response = await getProductsByFarmer(user.id);
          setProducts(response.data.products || []);
        } catch (requestError) {
          setError(
            requestError.response?.data?.message || "Failed to load your catalog."
          );
        } finally {
          setIsLoading(false);
        }
      };

      loadFarmerProducts();
      return;
    }

    const loadProducts = async (currentLocation) => {
      try {
        setIsLoading(true);
        setError("");
        const response = currentLocation
          ? await getNearbyProducts(currentLocation.latitude, currentLocation.longitude)
          : await getAllProducts();
        setProducts(response.data.products || []);
      } catch (requestError) {
        setError(requestError.response?.data?.message || "Failed to load products.");
      } finally {
        setIsLoading(false);
      }
    };

    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser.");
      loadProducts();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const currentLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };

        setUserLocation(currentLocation);
        setLocationError("");
        loadProducts(currentLocation);
      },
      (geolocationError) => {
        setLocationError(
          geolocationError.message || "Location access denied. Showing all products instead."
        );
        loadProducts();
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
      }
    );
  }, [isFarmer, user?.id]);

  const filteredProducts = useMemo(
    () =>
      products.filter((product) => {
        const matchesSearch = product.name
          .toLowerCase()
          .includes(searchTerm.toLowerCase());
        const matchesCategory =
          selectedCategory === "all" || product.category === selectedCategory;

        return matchesSearch && matchesCategory;
      }),
    [products, searchTerm, selectedCategory]
  );

  const getCartQuantity = (productId) =>
    cartItems.find((item) => item._id === productId)?.quantityInCart || 0;

  const getPhoneLinks = (phone) => {
    const sanitizedPhone = (phone || "").replace(/[^\d+]/g, "");

    return {
      tel: `tel:${sanitizedPhone}`,
      whatsapp: `https://wa.me/${sanitizedPhone.replace(/^\+/, "")}`,
    };
  };

  const handleRatingChange = (key, value) => {
    setRatingState((current) => ({
      ...current,
      [key]: {
        ...(current[key] || {}),
        value,
      },
    }));
  };

  const submitProductRating = async (productId) => {
    const rating = Number(ratingState[`product_${productId}`]?.value || 0);

    if (!rating) {
      return;
    }

    try {
      const response = await rateProduct(productId, rating);
      const updatedProduct = response.data.product;

      setProducts((current) =>
        current.map((product) => (product._id === productId ? updatedProduct : product))
      );
    } catch (_error) {
      setError("Failed to save product rating.");
    }
  };

  const submitFarmerRating = async (farmerId) => {
    const rating = Number(ratingState[`farmer_${farmerId}`]?.value || 0);

    if (!rating) {
      return;
    }

    try {
      const response = await rateFarmer(farmerId, rating);
      const updatedFarmer = response.data.farmer;

      setProducts((current) =>
        current.map((product) =>
          String(product.farmerId?._id || product.farmerId) === String(farmerId)
            ? {
                ...product,
                farmerId: {
                  ...product.farmerId,
                  averageRating: updatedFarmer.averageRating,
                },
              }
            : product
        )
      );
    } catch (_error) {
      setError("Failed to save farmer rating.");
    }
  };

  const farmerGroups = useMemo(() => {
    const groups = new Map();

    filteredProducts.forEach((product) => {
      const farmerId = product.farmerId?._id || product.farmerId;
      const latitude = product.location?.latitude;
      const longitude = product.location?.longitude;

      if (!farmerId || typeof latitude !== "number" || typeof longitude !== "number") {
        return;
      }

      if (!groups.has(farmerId)) {
        groups.set(farmerId, {
          id: farmerId,
          farmerName: product.farmerId?.name || "Unknown farmer",
          latitude,
          longitude,
          products: [],
          distanceInMeters: product.distanceInMeters,
        });
      }

      groups.get(farmerId).products.push(product);
    });

    return Array.from(groups.values());
  }, [filteredProducts]);

  const selectedFarmerGroup =
    farmerGroups.find((group) => group.id === selectedFarmerId) || null;

  useEffect(() => {
    if (isFarmer) {
      return;
    }

    if (!selectedFarmerId && farmerGroups.length > 0) {
      setSelectedFarmerId(farmerGroups[0].id);
      return;
    }

    if (
      selectedFarmerId &&
      farmerGroups.length > 0 &&
      !farmerGroups.some((group) => group.id === selectedFarmerId)
    ) {
      setSelectedFarmerId(farmerGroups[0].id);
    }
  }, [farmerGroups, isFarmer, selectedFarmerId]);

  // Farmer View
  if (isFarmer) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50">
        <FadeIn>
          <div className="max-w-7xl mx-auto px-4 py-8 lg:px-8">
            {/* Header */}
            <FadeIn delay={0.1}>
              <div className="bg-white rounded-2xl lg:rounded-3xl p-8 lg:p-12 mb-8 shadow-2xl border border-gray-100">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                  <div>
                    <span className="inline-block px-4 py-2 bg-emerald-100 text-emerald-800 text-sm font-semibold rounded-full mb-6">My catalog</span>
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
                      Review your active product listings.
                    </h1>
                    <p className="text-xl text-gray-600 leading-relaxed max-w-2xl">
                      Farmers see only their own catalog here, so this page stays focused on inventory visibility instead of buyer-only actions like cart, ratings, and purchase flow.
                    </p>
                  </div>

                  <Link
                    to="/farmer-dashboard"
                    className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all duration-300 transform hover:scale-105 hover:shadow-2xl shadow-lg inline-flex items-center"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Manage in Dashboard
                  </Link>
                </div>
              </div>
            </FadeIn>

            {/* Stats Cards */}
            <FadeIn delay={0.2}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-blue-200 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    </div>
                  </div>
                  <h3 className="text-sm font-medium text-blue-800 mb-1">Total Products</h3>
                  <p className="text-2xl font-bold text-blue-900">{products.length}</p>
                  <p className="text-xs text-blue-600 mt-1">In your catalog</p>
                </div>

                <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-6 border border-emerald-200">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-emerald-200 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                    </div>
                  </div>
                  <h3 className="text-sm font-medium text-emerald-800 mb-1">Total Units</h3>
                  <p className="text-2xl font-bold text-emerald-900">
                    {products.reduce((total, product) => total + Number(product.quantity || 0), 0)}
                  </p>
                  <p className="text-xs text-emerald-600 mt-1">Currently listed</p>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-purple-200 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                      </svg>
                    </div>
                  </div>
                  <h3 className="text-sm font-medium text-purple-800 mb-1">Combined Value</h3>
                  <p className="text-2xl font-bold text-purple-900">
                    ₹{products.reduce((total, product) => total + Number(product.price || 0), 0)}
                  </p>
                  <p className="text-xs text-purple-600 mt-1">Visible price points</p>
                </div>
              </div>
            </FadeIn>

            {error && (
              <FadeIn delay={0.1}>
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-8">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-red-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-red-700 font-medium">{error}</p>
                  </div>
                </div>
              </FadeIn>
            )}

            {/* Products Grid */}
            <FadeIn delay={0.3}>
              {isLoading ? (
                <div className="text-center py-12">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                    <svg className="w-8 h-8 text-gray-400 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Loading your catalog...</h3>
                </div>
              ) : products.length === 0 ? (
                <div className="text-center py-12">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No products listed yet</h3>
                  <p className="text-gray-600">Add products from the farmer dashboard.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {products.map((product) => (
                    <div key={product._id} className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
                      <div className="aspect-w-1 aspect-h-1">
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-full h-48 object-cover"
                        />
                      </div>
                      <div className="p-6">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-1">{product.name}</h3>
                            <span className="inline-block px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-full capitalize">
                              {product.category}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-2 mb-4">
                          <div className="flex items-center justify-between">
                            <span className="text-2xl font-bold text-emerald-600">₹{product.price}</span>
                          </div>
                          <div className="text-sm text-gray-600">
                            <p>Available: {product.quantity} units</p>
                            <p>Rating: {product.averageRating || 0} / 5 ⭐</p>
                          </div>
                        </div>

                        <div className="text-xs text-gray-500 mb-4">
                          <p>📍 {product.location?.latitude}, {product.location?.longitude}</p>
                        </div>

                        <Link
                          to="/farmer-dashboard"
                          className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white px-4 py-3 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 hover:shadow-lg shadow-md inline-flex items-center justify-center"
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Edit in Dashboard
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </FadeIn>
          </div>
        </FadeIn>
      </div>
    );
  }

  // Customer View
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50">
      <FadeIn>
        <div className="max-w-7xl mx-auto px-4 py-8 lg:px-8">
          {/* Header */}
          <FadeIn delay={0.1}>
            <div className="bg-white rounded-2xl lg:rounded-3xl p-8 lg:p-12 mb-8 shadow-2xl border border-gray-100">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                <div>
                  <span className="inline-block px-4 py-2 bg-emerald-100 text-emerald-800 text-sm font-semibold rounded-full mb-6">Marketplace</span>
                  <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
                    Browse fresh products from nearby farms.
                  </h1>
                  <p className="text-xl text-gray-600 leading-relaxed max-w-2xl">
                    Search by product, compare categories, view sellers on the map, and quickly move from discovery to contact and checkout.
                  </p>
                </div>

                <div className="bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl p-6 text-white">
                  <div className="text-center">
                    <div className="text-2xl font-bold mb-2">{filteredProducts.length}</div>
                    <div className="text-emerald-100 text-sm">Visible Listings</div>
                  </div>
                </div>
              </div>
            </div>
          </FadeIn>

          {/* Search and Filters */}
          <FadeIn delay={0.2}>
            <div className="bg-white rounded-2xl p-6 mb-8 shadow-xl border border-gray-100">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Search Products
                  </label>
                  <input
                    type="search"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Search by product name..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-300 text-gray-900 placeholder-gray-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Category
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={(event) => setSelectedCategory(event.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-300 text-gray-900 bg-white"
                  >
                    <option value="all">All Categories</option>
                    <option value="vegetable">Vegetables</option>
                    <option value="pulses">Pulses</option>
                  </select>
                </div>
              </div>
            </div>
          </FadeIn>

          {/* Stats Cards */}
          <FadeIn delay={0.3}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-blue-200 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                </div>
                <h3 className="text-sm font-medium text-blue-800 mb-1">Total Products</h3>
                <p className="text-2xl font-bold text-blue-900">{products.length}</p>
                <p className="text-xs text-blue-600 mt-1">Loaded from database</p>
              </div>

              <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-6 border border-emerald-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-emerald-200 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                </div>
                <h3 className="text-sm font-medium text-emerald-800 mb-1">Farmer Locations</h3>
                <p className="text-2xl font-bold text-emerald-900">{farmerGroups.length}</p>
                <p className="text-xs text-emerald-600 mt-1">Available on map</p>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-purple-200 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                  </div>
                </div>
                <h3 className="text-sm font-medium text-purple-800 mb-1">Current Filter</h3>
                <p className="text-2xl font-bold text-purple-900 capitalize">
                  {selectedCategory === "all" ? "All" : selectedCategory}
                </p>
                <p className="text-xs text-purple-600 mt-1">Category focus</p>
              </div>
            </div>
          </FadeIn>

          {/* Error Messages */}
          {error && (
            <FadeIn delay={0.1}>
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-8">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-red-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-red-700 font-medium">{error}</p>
                </div>
              </div>
            </FadeIn>
          )}

          {locationError && (
            <FadeIn delay={0.1}>
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-8">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-yellow-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <p className="text-yellow-700 font-medium">{locationError}</p>
                </div>
              </div>
            </FadeIn>
          )}

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
            {/* Sidebar */}
            <div className="xl:col-span-1 space-y-8">
              {/* Map Section */}
              <FadeIn delay={0.4}>
                <div className="bg-white rounded-2xl p-6 shadow-xl border border-gray-100">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-gray-900">Discover by Location</h2>
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-full">
                      {userLocation ? "Live" : "Ready"}
                    </span>
                  </div>
                  <ProductMap
                    apiKey={GOOGLE_MAPS_API_KEY}
                    farmerGroups={farmerGroups}
                    onMarkerSelect={setSelectedFarmerId}
                    selectedFarmerId={selectedFarmerId}
                    userLocation={userLocation}
                  />
                </div>
              </FadeIn>

              {/* Selected Farmer */}
              <FadeIn delay={0.5}>
                <div className="bg-white rounded-2xl p-6 shadow-xl border border-gray-100">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-gray-900">Selected Seller</h2>
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-full">
                      {selectedFarmerGroup ? selectedFarmerGroup.products.length : 0} products
                    </span>
                  </div>

                  {selectedFarmerGroup ? (
                    <div className="space-y-4">
                      <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl p-4 border border-emerald-200">
                        <h3 className="font-semibold text-gray-900 mb-2">{selectedFarmerGroup.farmerName}</h3>
                        <div className="space-y-1 text-sm text-gray-600">
                          <p>⭐ Rating: {selectedFarmerGroup.products[0]?.farmerId?.averageRating || 0} / 5</p>
                          <p>📍 {selectedFarmerGroup.latitude}, {selectedFarmerGroup.longitude}</p>
                          {typeof selectedFarmerGroup.distanceInMeters === "number" && (
                            <p>📏 {(selectedFarmerGroup.distanceInMeters / 1000).toFixed(2)} km away</p>
                          )}
                        </div>
                      </div>

                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {selectedFarmerGroup.products.map((product) => (
                          <div key={product._id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                            <img
                              src={product.imageUrl}
                              alt={product.name}
                              className="w-full h-24 object-cover rounded-lg mb-3"
                            />
                            <h4 className="font-semibold text-gray-900 mb-1">{product.name}</h4>
                            <p className="text-sm text-gray-600 mb-2">₹{product.price} • {product.quantity} available</p>
                            <p className="text-xs text-gray-500 mb-3">⭐ {product.averageRating || 0} / 5</p>

                            <div className="flex flex-col space-y-2">
                              {product.farmerId?.phone && (
                                <div className="flex space-x-2">
                                  <a
                                    href={getPhoneLinks(product.farmerId.phone).tel}
                                    className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-lg text-xs font-medium transition-colors text-center"
                                  >
                                    📞 Call
                                  </a>
                                  <a
                                    href={getPhoneLinks(product.farmerId.phone).whatsapp}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex-1 bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded-lg text-xs font-medium transition-colors text-center"
                                  >
                                    💬 WhatsApp
                                  </a>
                                </div>
                              )}
                              {product.farmerId?._id && (
                                <Link
                                  to={`/chat?user=${product.farmerId._id}&name=${encodeURIComponent(
                                    product.farmerId?.name || "Farmer"
                                  )}`}
                                  className="w-full bg-purple-500 hover:bg-purple-600 text-white px-3 py-2 rounded-lg text-xs font-medium transition-colors text-center inline-block"
                                >
                                  💬 Chat
                                </Link>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="inline-flex items-center justify-center w-12 h-12 bg-gray-100 rounded-full mb-3">
                        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                        </svg>
                      </div>
                      <h3 className="text-sm font-semibold text-gray-900 mb-1">Click a farmer marker</h3>
                      <p className="text-xs text-gray-600">Inspect the nearest seller from the map.</p>
                    </div>
                  )}
                </div>
              </FadeIn>
            </div>

            {/* Products Grid */}
            <div className="xl:col-span-3">
              <FadeIn delay={0.6}>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{filteredProducts.length} Results</h2>
                    <p className="text-gray-600">Showing products that match your current filters.</p>
                  </div>
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
                ) : filteredProducts.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No products match your search</h3>
                    <p className="text-gray-600">Try adjusting your filters or search terms.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredProducts.map((product) => (
                      <div key={product._id} className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
                        <div className="aspect-w-1 aspect-h-1">
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="w-full h-48 object-cover"
                          />
                        </div>
                        <div className="p-6">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900 mb-1">{product.name}</h3>
                              <span className="inline-block px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-full capitalize">
                                {product.category}
                              </span>
                            </div>
                          </div>

                          <div className="space-y-2 mb-4">
                            <div className="flex items-center justify-between">
                              <span className="text-2xl font-bold text-emerald-600">₹{product.price}</span>
                            </div>
                            <div className="text-sm text-gray-600 space-y-1">
                              <p>👨‍🌾 {product.farmerId?.name || "Unknown farmer"}</p>
                              <p>⭐ Farmer: {product.farmerId?.averageRating || 0} / 5</p>
                              <p>⭐ Product: {product.averageRating || 0} / 5</p>
                              <p>📦 Available: {product.quantity} units</p>
                            </div>
                          </div>

                          {/* Contact Actions */}
                          {product.farmerId?.phone && (
                            <div className="flex space-x-2 mb-4">
                              <a
                                href={getPhoneLinks(product.farmerId.phone).tel}
                                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors text-center"
                              >
                                📞 Call
                              </a>
                              <a
                                href={getPhoneLinks(product.farmerId.phone).whatsapp}
                                target="_blank"
                                rel="noreferrer"
                                className="flex-1 bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors text-center"
                              >
                                💬 WhatsApp
                              </a>
                            </div>
                          )}

                          {product.farmerId?._id && (
                            <Link
                              to={`/chat?user=${product.farmerId._id}&name=${encodeURIComponent(
                                product.farmerId?.name || "Farmer"
                              )}`}
                              className="w-full bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors text-center inline-block mb-4"
                            >
                              💬 Chat with Farmer
                            </Link>
                          )}

                          {/* Rating Section */}
                          {isCustomer && (
                            <div className="space-y-3 mb-4">
                              <div className="flex space-x-2">
                                <select
                                  value={ratingState[`product_${product._id}`]?.value || ""}
                                  onChange={(event) =>
                                    handleRatingChange(`product_${product._id}`, event.target.value)
                                  }
                                  className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                >
                                  <option value="">Rate product</option>
                                  {[1, 2, 3, 4, 5].map(num => (
                                    <option key={num} value={num}>{num} ⭐</option>
                                  ))}
                                </select>
                                <button
                                  type="button"
                                  onClick={() => submitProductRating(product._id)}
                                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-lg transition-colors"
                                >
                                  Rate
                                </button>
                              </div>

                              {product.farmerId?._id && (
                                <div className="flex space-x-2">
                                  <select
                                    value={ratingState[`farmer_${product.farmerId._id}`]?.value || ""}
                                    onChange={(event) =>
                                      handleRatingChange(
                                        `farmer_${product.farmerId._id}`,
                                        event.target.value
                                      )
                                    }
                                    className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                  >
                                    <option value="">Rate farmer</option>
                                    {[1, 2, 3, 4, 5].map(num => (
                                      <option key={num} value={num}>{num} ⭐</option>
                                    ))}
                                  </select>
                                  <button
                                    type="button"
                                    onClick={() => submitFarmerRating(product.farmerId._id)}
                                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-lg transition-colors"
                                  >
                                    Rate
                                  </button>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Add to Cart / Login */}
                          {isCustomer ? (
                            <button
                              type="button"
                              onClick={() => addToCart(product)}
                              disabled={getCartQuantity(product._id) >= product.quantity}
                              className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white px-4 py-3 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 hover:shadow-lg shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                            >
                              {getCartQuantity(product._id) >= product.quantity ? (
                                <div className="flex items-center justify-center">
                                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  Max Added
                                </div>
                              ) : (
                                <div className="flex items-center justify-center">
                                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                                  </svg>
                                  Add to Cart
                                </div>
                              )}
                            </button>
                          ) : (
                            <Link
                              to="/login"
                              className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white px-4 py-3 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 hover:shadow-lg shadow-md inline-flex items-center justify-center"
                            >
                              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                              </svg>
                              Login to Order
                            </Link>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </FadeIn>
            </div>
          </div>
        </div>
      </FadeIn>
    </div>
  );
}

export default ProductListing;
