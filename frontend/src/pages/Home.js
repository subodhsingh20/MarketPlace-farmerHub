import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import ProductCard from "../components/ProductCard";
import FadeIn from "../components/FadeIn";
import { getAllProducts } from "../services/authService";
import LoadingSpinner from "../components/LoadingSpinner";

function Home() {
  const { user } = useAuth();
  const { addToCart, cartItems } = useCart();
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const isCustomer = user?.role === "customer";

  const getCartQuantity = (productId) =>
    cartItems.find((item) => item._id === productId)?.quantityInCart || 0;

  useEffect(() => {
    const loadFeaturedProducts = async () => {
      try {
        setIsLoading(true);
        const response = await getAllProducts();
        // Get first 4 products as featured
        setFeaturedProducts(response.data.products.slice(0, 4));
      } catch (error) {
        console.error("Failed to load featured products:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadFeaturedProducts();
  }, []);

  if (user?.role === "farmer") {
    return (
      <section className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-50 to-green-50 px-4 py-8 sm:px-6">
        <div className="responsive-shell w-full">
          <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(22rem,0.95fr)] lg:gap-10 xl:gap-14">
            {/* Left: Content */}
            <div className="space-y-6 lg:max-w-[40rem]">
              <div>
                <span className="responsive-chip mb-5 inline-block bg-emerald-100 text-emerald-800">Farmer workspace</span>
                <h1 className="responsive-title mb-5 font-bold">Manage your store, stock, and order flow.</h1>
                <p className="responsive-copy max-w-xl">
                  This side of the platform is focused on your business operations:
                  list products, monitor live orders, track earnings, and keep your
                  catalog ready for buyers.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap lg:gap-4">
                <Link to="/farmer-dashboard" className="responsive-cta inline-flex w-full items-center justify-center rounded-xl bg-emerald-600 px-6 text-center text-base font-bold text-white transition-all duration-300 hover:bg-emerald-700 sm:min-w-[15rem] sm:flex-1 lg:flex-none">
                  Open Farmer Dashboard
                </Link>
                <Link to="/products" className="responsive-cta inline-flex w-full items-center justify-center rounded-xl border-2 border-emerald-600 px-6 text-center text-base font-bold text-emerald-600 transition-all duration-300 hover:bg-emerald-50 sm:min-w-[13rem] sm:flex-1 lg:flex-none">
                  View My products
                </Link>
              </div>
            </div>
            {/* Right: Image */}
            <div className="flex justify-center lg:justify-end">
              <a
                href="https://unsplash.com/photos/farmer-handful-of-harvested-wheat-kernels-from-the-heap-loaded-into-tractor-trailer-mMmIC32vdxQ"
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full max-w-xl lg:max-w-[34rem] xl:max-w-[38rem]"
              >
                <img
                  src="https://plus.unsplash.com/premium_photo-1661930182051-06673fc544f9?auto=format&fit=crop&w=1974&q=80&crop=entropy&cs=srgb&fm=jpg&ixid=M3wxMjA3fDB8MXxhbGx8fHx8fHx8fHwxNzczOTMxMzE1fA&ixlib=rb-4.1.0"
                  alt="Farmer handful of harvested wheat kernels"
                  className="h-72 w-full rounded-[1.75rem] object-cover object-center shadow-2xl sm:h-80 lg:h-[22rem] xl:h-[25rem]"
                />
              </a>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (user?.role === "customer") {
    return (
      <section className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 px-4 py-8 sm:px-6">
        <div className="responsive-shell w-full">
          <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(22rem,0.95fr)] lg:gap-10 xl:gap-14">
            {/* Left: Content */}
            <div className="space-y-6 lg:max-w-[40rem]">
              <div>
                <span className="responsive-chip mb-5 inline-block bg-blue-100 text-blue-800">Customer marketplace</span>
                <h1 className="responsive-title mb-5 font-bold">Discover nearby produce and order with confidence.</h1>
                <p className="responsive-copy max-w-xl">
                  Your customer view is centered on browsing products, comparing
                  sellers, adding to cart, tracking orders, and staying connected
                  with farmers.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap lg:gap-4">
                <Link to="/products" className="responsive-cta inline-flex w-full items-center justify-center rounded-xl bg-green-600 px-6 text-center text-base font-bold text-white transition-all duration-300 hover:bg-green-700 sm:min-w-[14rem] sm:flex-1 lg:flex-none">
                  Explore Marketplace
                </Link>
                <Link to="/customer-dashboard" className="responsive-cta inline-flex w-full items-center justify-center rounded-xl border-2 border-green-600 px-6 text-center text-base font-bold text-green-600 transition-all duration-300 hover:bg-blue-50 sm:min-w-[16rem] sm:flex-1 lg:flex-none">
                  Open Customer Dashboard
                </Link>
              </div>
            </div>
            {/* Right: Image */}
              <div className="flex justify-center lg:justify-end">
                <a
                  href="https://unsplash.com/photos/young-indian-farmer-standing-in-cotton-agriculture-field-NajxUaCK7XQ"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full max-w-xl lg:max-w-[34rem] xl:max-w-[38rem]"
                >
                  <img
                    src="https://plus.unsplash.com/premium_photo-1682092034268-645322c1d308?auto=format&fit=crop&q=60&crop=entropy&cs=srgb&fm=jpg&ixid=M3wxMjA3fDB8MXxhbGx8fHx8fHx8fHwxNzczOTMxOTk3fA&ixlib=rb-4.1.0"
                    alt="Fresh market produce shopping"
                    loading="eager"
                    fetchPriority="high"
                    decoding="async"
                    className="h-72 w-full rounded-[1.75rem] object-cover object-center shadow-2xl sm:h-80 lg:h-[22rem] xl:h-[25rem]"
                  />
                </a>
              </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <FadeIn>
        <section className="bg-gradient-to-br from-emerald-50/50 to-teal-50/50 min-h-screen flex items-center justify-center w-full">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-16 items-center">
              {/* Left Content */}
              <div className="text-left space-y-6">
                <FadeIn delay={0.1}>
                  <div className="inline-flex items-center px-4 py-2 rounded-full bg-emerald-100/80 text-emerald-800 text-sm font-medium">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2 animate-pulse"></span>
                    Connecting Farmers & Consumers
                  </div>
                </FadeIn>

                <FadeIn delay={0.2}>
                  <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-gray-900 leading-tight">
                    Buy Direct from
                    <span className="block text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 via-green-600 to-emerald-700">
                      Farmers
                    </span>
                  </h1>
                </FadeIn>

                <FadeIn delay={0.3}>
                  <p className="text-lg md:text-xl text-gray-700 leading-relaxed max-w-lg">
                    No middlemen means lower prices, fresher products delivered straight from the farm.
                  </p>
                </FadeIn>

                <FadeIn delay={0.4}>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <Link
                      to="/products"
                      className="group bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all duration-300 shadow-lg hover:shadow-xl w-full sm:w-auto"
                    >
                      <span className="flex items-center justify-center">
                        Shop Fresh Produce
                        <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </span>
                    </Link>
                    <Link
                      to="/register"
                      className="group border-2 border-emerald-600 text-emerald-600 hover:bg-emerald-50 px-8 py-4 rounded-xl font-bold text-lg transition-all duration-300 hover:shadow-lg w-full sm:w-auto"
                    >
                      Start Selling
                    </Link>
                  </div>
                </FadeIn>
              </div>

              {/* Right Content - Hero Image */}
              <FadeIn delay={0.5} direction="left">
                <div className="flex justify-center">
                  <img 
                    src="https://images.unsplash.com/photo-1607305387299-a3d9611cd469?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1974&q=80" 
                    alt="Fresh organic vegetables from local farm" 
                    className="w-full max-w-lg h-80 lg:h-[450px] object-cover rounded-2xl shadow-2xl"
                  />
                </div>
              </FadeIn>
            </div>
          </div>
        </section>
      </FadeIn>

      {/* Categories Section */}
      <FadeIn>
        <section className="my-16 bg-gradient-to-b from-[#f9fcf8] via-white to-[#eef7f0] py-8 lg:py-14">
          <div className="max-w-7xl mx-auto px-6">
            <FadeIn delay={0.1}>
              <div className="text-center mb-12 lg:mb-16">
                <span className="mb-4 inline-flex rounded-full border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700 shadow-sm">
                  Fresh Picks
                </span>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4 lg:mb-5">
                  Shop by Category
                </h2>
                <p className="text-lg sm:text-xl lg:text-2xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
                  Browse produce through bold category lanes that are easy to spot, easy to tap, and fast to shop.
                </p>
              </div>
            </FadeIn>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
              <FadeIn delay={0.2} className="w-full">
                <Link
                  to="/products?category=vegetable"
                  className="group relative block min-h-[22rem] overflow-hidden rounded-[2rem] border border-emerald-200 bg-gradient-to-br from-emerald-500 via-green-500 to-emerald-700 p-7 text-left text-white shadow-[0_24px_60px_rgba(21,128,61,0.18)] transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_28px_70px_rgba(21,128,61,0.26)] sm:p-8 lg:min-h-[24rem] lg:p-10"
                >
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.24),transparent_35%),linear-gradient(180deg,rgba(255,255,255,0.06),rgba(0,0,0,0.12))]" />
                  <div className="absolute -right-12 bottom-0 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
                  <div className="relative z-10 flex h-full flex-col">
                    <div className="flex items-start justify-between gap-4">
                      <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-white/18 backdrop-blur-md transition-transform duration-300 group-hover:scale-110">
                        <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20h10M12 4C9.239 4 7 6.239 7 9c0 1.837.993 3.441 2.469 4.309.343.202.531.587.531.985V16h4v-1.706c0-.398.188-.783.531-.985C16.007 12.441 17 10.837 17 9c0-2.761-2.239-5-5-5z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 16h6" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20h4" />
                        </svg>
                      </div>
                      <span className="rounded-full border border-white/20 bg-white/12 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-50">
                        Seasonal
                      </span>
                    </div>

                    <div className="mt-8">
                      <h3 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-[2.8rem]">
                        Vegetables
                      </h3>
                      <p className="mt-3 max-w-md text-base leading-7 text-emerald-50/90 sm:text-lg">
                        Crisp greens, roots, and everyday staples sourced directly from nearby farms.
                      </p>
                    </div>

                    <div className="mt-8 grid max-w-md grid-cols-2 gap-3">
                      <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-sm">
                        <p className="text-xs uppercase tracking-[0.14em] text-emerald-100">Popular</p>
                        <p className="mt-1 text-sm font-semibold text-white">Tomato, Onion, Spinach</p>
                      </div>
                      <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-sm">
                        <p className="text-xs uppercase tracking-[0.14em] text-emerald-100">Best For</p>
                        <p className="mt-1 text-sm font-semibold text-white">Daily kitchen essentials</p>
                      </div>
                    </div>

                    <div className="mt-auto pt-8">
                      <div className="inline-flex items-center text-base font-semibold text-white transition-transform duration-300 group-hover:translate-x-2">
                        Explore Vegetables
                        <svg className="ml-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </Link>
              </FadeIn>

              <FadeIn delay={0.3} className="w-full">
                <Link
                  to="/products?category=pulses"
                  className="group relative block min-h-[22rem] overflow-hidden rounded-[2rem] border border-amber-200 bg-gradient-to-br from-amber-500 via-orange-500 to-amber-700 p-7 text-left text-white shadow-[0_24px_60px_rgba(217,119,6,0.18)] transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_28px_70px_rgba(217,119,6,0.24)] sm:p-8 lg:min-h-[24rem] lg:p-10"
                >
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.22),transparent_35%),linear-gradient(180deg,rgba(255,255,255,0.06),rgba(0,0,0,0.12))]" />
                  <div className="absolute -left-10 bottom-2 h-44 w-44 rounded-full bg-white/10 blur-2xl" />
                  <div className="relative z-10 flex h-full flex-col">
                    <div className="flex items-start justify-between gap-4">
                      <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-white/18 backdrop-blur-md transition-transform duration-300 group-hover:scale-110">
                        <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8c0-1.657 2.239-3 5-3s5 1.343 5 3-2.239 3-5 3-5-1.343-5-3z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8v4c0 1.657 2.239 3 5 3s5-1.343 5-3V8" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12v4c0 1.657 2.239 3 5 3s5-1.343 5-3v-4" />
                        </svg>
                      </div>
                      <span className="rounded-full border border-white/20 bg-white/12 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-amber-50">
                        Pantry
                      </span>
                    </div>

                    <div className="mt-8">
                      <h3 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-[2.8rem]">
                        Pulses
                      </h3>
                      <p className="mt-3 max-w-md text-base leading-7 text-orange-50/90 sm:text-lg">
                        Protein-rich lentils and legumes grouped for pantry planning and bulk buys.
                      </p>
                    </div>

                    <div className="mt-8 grid max-w-md grid-cols-2 gap-3">
                      <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-sm">
                        <p className="text-xs uppercase tracking-[0.14em] text-orange-100">Popular</p>
                        <p className="mt-1 text-sm font-semibold text-white">Moong, Masoor, Chana</p>
                      </div>
                      <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-sm">
                        <p className="text-xs uppercase tracking-[0.14em] text-orange-100">Best For</p>
                        <p className="mt-1 text-sm font-semibold text-white">Monthly pantry restocks</p>
                      </div>
                    </div>

                    <div className="mt-auto pt-8">
                      <div className="inline-flex items-center text-base font-semibold text-white transition-transform duration-300 group-hover:translate-x-2">
                        Explore Pulses
                        <svg className="ml-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </Link>
              </FadeIn>
            </div>

            <FadeIn delay={0.35}>
              <div className="mt-8 grid gap-4 rounded-[2rem] border border-emerald-100 bg-white/90 p-5 shadow-[0_18px_50px_rgba(16,24,40,0.06)] sm:grid-cols-3 sm:p-6">
                <div className="rounded-2xl bg-emerald-50 px-4 py-4">
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-emerald-700">Fast Filter</p>
                  <p className="mt-2 text-sm leading-6 text-gray-600">
                    Jump straight into the aisle you need instead of browsing every listing.
                  </p>
                </div>
                <div className="rounded-2xl bg-amber-50 px-4 py-4">
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-amber-700">Fresh Supply</p>
                  <p className="mt-2 text-sm leading-6 text-gray-600">
                    Seasonal produce and pantry staples stay clearly grouped for faster comparison.
                  </p>
                </div>
                <div className="rounded-2xl bg-sky-50 px-4 py-4">
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-sky-700">Direct Access</p>
                  <p className="mt-2 text-sm leading-6 text-gray-600">
                    Open a category and connect with nearby farmers without extra clicks.
                  </p>
                </div>
              </div>
            </FadeIn>
          </div>
        </section>
      </FadeIn>

        {/* How It Works Section */}
        <FadeIn>
          <section id="how-it-works" className="my-16 bg-gradient-to-b from-white to-gray-50">
            <div className="max-w-7xl mx-auto px-6">
              <FadeIn delay={0.1}>
                <div className="text-center mb-12 lg:mb-20">
                  <h2 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl 2xl:text-7xl font-bold text-gray-900 mb-4 lg:mb-6">
                    How It Works
                  </h2>
                  <p className="text-lg sm:text-xl lg:text-2xl xl:text-3xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
                    Simple 3-step process to connect farmers and customers
                  </p>
                </div>
              </FadeIn>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12 xl:gap-16">
                <FadeIn delay={0.2}>
                  <div className="group text-center p-8 lg:p-12 xl:p-16 rounded-2xl bg-gradient-to-br from-emerald-50 to-green-50 hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-4 hover:scale-105 relative">
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 w-16 h-16 bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-lg">
                      1
                    </div>
                    <div className="inline-flex items-center justify-center w-20 h-20 lg:w-24 lg:h-24 xl:w-28 xl:h-28 bg-gradient-to-br from-emerald-500 to-green-600 rounded-full mb-6 lg:mb-8 group-hover:scale-110 transition-transform duration-300 mx-auto">
                      <svg className="w-10 h-10 lg:w-12 lg:h-12 xl:w-14 xl:h-14 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                      </svg>
                    </div>
                    <h3 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-bold text-gray-900 mb-4">Farmers List Products</h3>
                    <p className="text-gray-600 text-base lg:text-lg xl:text-xl leading-relaxed max-w-md mx-auto">Farmers add fresh produce with photos, prices, stock levels, and exact location coordinates</p>
                  </div>
                </FadeIn>

                <FadeIn delay={0.3}>
                  <div className="group text-center p-8 lg:p-12 xl:p-16 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-4 hover:scale-105 relative">
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-lg">
                      2
                    </div>
                    <div className="inline-flex items-center justify-center w-20 h-20 lg:w-24 lg:h-24 xl:w-28 xl:h-28 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full mb-6 lg:mb-8 group-hover:scale-110 transition-transform duration-300 mx-auto">
                      <svg className="w-10 h-10 lg:w-12 lg:h-12 xl:w-14 xl:h-14 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </div>
                    <h3 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-bold text-gray-900 mb-4">Customers Browse Nearby</h3>
                    <p className="text-gray-600 text-base lg:text-lg xl:text-xl leading-relaxed max-w-md mx-auto">Customers search by location to find fresh products from nearby farmers with real-time availability</p>
                  </div>
                </FadeIn>

                <FadeIn delay={0.4}>
                  <div className="group text-center p-8 lg:p-12 xl:p-16 rounded-2xl bg-gradient-to-br from-orange-50 to-amber-50 hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-4 hover:scale-105 relative">
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 w-16 h-16 bg-gradient-to-br from-orange-500 to-amber-600 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-lg">
                      3
                    </div>
                    <div className="inline-flex items-center justify-center w-20 h-20 lg:w-24 lg:h-24 xl:w-28 xl:h-28 bg-gradient-to-br from-orange-500 to-amber-600 rounded-full mb-6 lg:mb-8 group-hover:scale-110 transition-transform duration-300 mx-auto">
                      <svg className="w-10 h-10 lg:w-12 lg:h-12 xl:w-14 xl:h-14 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012 2m0 0h2a2 2 0 012 2v7m-4-7v7m-4-7v7" />
                      </svg>
                    </div>
                    <h3 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-bold text-gray-900 mb-4">Order or Visit Farmer</h3>
                    <p className="text-gray-600 text-base lg:text-lg xl:text-xl leading-relaxed max-w-md mx-auto">Place orders online or arrange direct pickup/visit with farmers for the freshest experience</p>
                  </div>
                </FadeIn>
              </div>
            </div>
          </section>
        </FadeIn>

      {/* Featured Products Section */}
      <FadeIn>
        <section className="py-16 lg:py-24 xl:py-32 bg-gradient-to-b from-gray-50 to-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16">
            <FadeIn delay={0.1}>
              <div className="text-center mb-12 lg:mb-20">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl 2xl:text-7xl font-bold text-gray-900 mb-4 lg:mb-6">
            Nearby Farmers Preview
          </h2>
                <p className="text-lg sm:text-xl lg:text-2xl xl:text-3xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
                  Handpicked fresh produce from our most trusted farmers
                </p>
              </div>
            </FadeIn>

          {isLoading ? (
            <FadeIn delay={0.2}>
              <div className="flex flex-col items-center justify-center py-16 lg:py-24">
                <LoadingSpinner size="large" />
                <p className="text-gray-600 mt-6 lg:mt-8 text-lg lg:text-xl xl:text-2xl font-medium">Loading fresh products...</p>
                <div className="flex space-x-1 lg:space-x-2 mt-4 lg:mt-6">
                  <div className="w-2 h-2 lg:w-3 lg:h-3 bg-emerald-600 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 lg:w-3 lg:h-3 bg-emerald-600 rounded-full animate-bounce animation-delay-100"></div>
                  <div className="w-2 h-2 lg:w-3 lg:h-3 bg-emerald-600 rounded-full animate-bounce animation-delay-200"></div>
                </div>
              </div>
            </FadeIn>
          ) : featuredProducts.length > 0 ? (
            <FadeIn delay={0.2}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 lg:gap-8 xl:gap-10">
                {featuredProducts.map((product, index) => (
                  <FadeIn key={product._id} delay={0.1 + index * 0.1}>
                    <ProductCard
                      product={product}
                      isCustomer={isCustomer}
                      getCartQuantity={getCartQuantity}
                      addToCart={addToCart}
                    />
                  </FadeIn>
                ))}
              </div>
            </FadeIn>
          ) : (
            <FadeIn delay={0.2}>
              <div className="text-center py-16 lg:py-24">
                <div className="w-20 h-20 lg:w-24 lg:h-24 xl:w-32 xl:h-32 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6 lg:mb-8">
                  <svg className="w-10 h-10 lg:w-12 lg:h-12 xl:w-16 xl:h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <h3 className="text-xl lg:text-2xl xl:text-3xl font-semibold text-gray-900 mb-2 lg:mb-4">No products available</h3>
                <p className="text-gray-600 text-base lg:text-lg xl:text-xl">Check back soon for fresh produce from our farmers.</p>
              </div>
            </FadeIn>
          )}

          <FadeIn delay={0.3}>
            <div className="text-center mt-12 lg:mt-16 xl:mt-20">
              <Link
                to="/products"
                className="group inline-flex items-center bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white px-8 lg:px-12 py-4 lg:py-5 xl:py-6 rounded-xl font-bold text-lg lg:text-xl xl:text-2xl transition-all duration-300 transform hover:scale-105 hover:shadow-2xl shadow-lg"
              >
                <span>Explore All Products</span>
                <svg className="w-5 h-5 lg:w-6 lg:h-6 xl:w-7 xl:h-7 ml-3 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>
      </FadeIn>

      {/* Why Choose Us Section */}
      <FadeIn>
        <section className="py-16 lg:py-24 xl:py-32 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16">
            <FadeIn delay={0.1}>
              <div className="text-center mb-12 lg:mb-20">
                <h2 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl 2xl:text-7xl font-bold text-gray-900 mb-4 lg:mb-6">
                  Our Features
                </h2>
                <p className="text-lg sm:text-xl lg:text-2xl xl:text-3xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
                  Experience the difference of buying directly from farmers
                </p>
              </div>
            </FadeIn>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-10 xl:gap-12 2xl:gap-16">
              <FadeIn delay={0.2}>
                <div className="group text-center p-6 sm:p-8 lg:p-10 xl:p-12 2xl:p-16 rounded-2xl lg:rounded-3xl bg-gradient-to-br from-emerald-50 to-green-50 hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-3 hover:scale-105">
                  <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 xl:w-28 xl:h-28 2xl:w-32 2xl:h-32 bg-gradient-to-br from-emerald-500 to-green-600 rounded-full mb-4 lg:mb-6 xl:mb-8 group-hover:scale-110 transition-transform duration-300">
                    <svg className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 xl:w-14 xl:h-14 2xl:w-16 2xl:h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V7M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                    </svg>
                  </div>
                  <h3 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl 2xl:text-5xl font-bold text-gray-900 mb-3 lg:mb-4 xl:mb-6">Direct from Farmers</h3>
                  <p className="text-gray-600 text-base sm:text-lg lg:text-xl xl:text-2xl leading-relaxed">Cut out middlemen and buy straight from local farmers</p>
                </div>
              </FadeIn>

              <FadeIn delay={0.3}>
                <div className="group text-center p-6 sm:p-8 lg:p-10 xl:p-12 2xl:p-16 rounded-2xl lg:rounded-3xl bg-gradient-to-br from-blue-50 to-indigo-50 hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-3 hover:scale-105">
                  <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 xl:w-28 xl:h-28 2xl:w-32 2xl:h-32 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full mb-4 lg:mb-6 xl:mb-8 group-hover:scale-110 transition-transform duration-300">
                    <svg className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 xl:w-14 xl:h-14 2xl:w-16 2xl:h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                  </div>
                  <h3 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl 2xl:text-5xl font-bold text-gray-900 mb-3 lg:mb-4 xl:mb-6">Lower Prices</h3>
                  <p className="text-gray-600 text-base sm:text-lg lg:text-xl xl:text-2xl leading-relaxed">No middlemen - get the best prices directly from farmers</p>
                </div>
              </FadeIn>

              <FadeIn delay={0.4}>
                <div className="group text-center p-6 sm:p-8 lg:p-10 xl:p-12 2xl:p-16 rounded-2xl lg:rounded-3xl bg-gradient-to-br from-amber-50 to-orange-50 hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-3 hover:scale-105">
                  <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 xl:w-28 xl:h-28 2xl:w-32 2xl:h-32 bg-gradient-to-br from-amber-500 to-orange-600 rounded-full mb-4 lg:mb-6 xl:mb-8 group-hover:scale-110 transition-transform duration-300">
                    <svg className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 xl:w-14 xl:h-14 2xl:w-16 2xl:h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                    </svg>
                  </div>
                  <h3 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl 2xl:text-5xl font-bold text-gray-900 mb-3 lg:mb-4 xl:mb-6">Location-based Search</h3>
                <p className="text-gray-600 text-base sm:text-lg lg:text-xl xl:text-2xl leading-relaxed">Find nearby farmers and products based on your location</p>
                </div>
              </FadeIn>
            </div>
          </div>
        </section>
      </FadeIn>

      {/* Testimonials Section */}
      <FadeIn>
        <section className="py-16 lg:py-24 xl:py-32 bg-gradient-to-br from-emerald-50 to-green-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16">
            <FadeIn delay={0.1}>
              <div className="text-center mb-12 lg:mb-20">
                <h2 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl 2xl:text-7xl font-bold text-gray-900 mb-4 lg:mb-6">
                  What Our Community Says
                </h2>
                <p className="text-lg sm:text-xl lg:text-2xl xl:text-3xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
                  Real stories from farmers and customers who are part of our marketplace
                </p>
              </div>
            </FadeIn>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 xl:gap-10">
              <FadeIn delay={0.2}>
                <div className="group bg-white rounded-2xl lg:rounded-3xl p-6 sm:p-8 lg:p-10 xl:p-12 shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2">
                  <div className="flex items-center mb-6 lg:mb-8">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 xl:w-20 xl:h-20 bg-gradient-to-br from-emerald-500 to-green-600 rounded-full flex items-center justify-center text-white font-bold text-lg lg:text-xl xl:text-2xl">
                      S
                    </div>
                    <div className="ml-4 lg:ml-6">
                      <h4 className="font-bold text-gray-900 text-lg lg:text-xl xl:text-2xl">Sarah Johnson</h4>
                      <p className="text-gray-600 text-sm lg:text-base xl:text-lg">Customer</p>
                    </div>
                  </div>
                  <div className="flex text-emerald-500 mb-4 lg:mb-6">
                    {[...Array(5)].map((_, i) => (
                      <svg key={i} className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 xl:w-7 xl:h-7 fill-current" viewBox="0 0 24 24">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                      </svg>
                    ))}
                  </div>
                  <p className="text-gray-700 italic leading-relaxed text-base lg:text-lg xl:text-xl">
                    "The freshest vegetables I've ever tasted! Buying directly from local farmers has completely changed my weekly grocery shopping. The quality is unmatched."
                  </p>
                </div>
              </FadeIn>

              <FadeIn delay={0.3}>
                <div className="group bg-white rounded-2xl lg:rounded-3xl p-6 sm:p-8 lg:p-10 xl:p-12 shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2">
                  <div className="flex items-center mb-6 lg:mb-8">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 xl:w-20 xl:h-20 bg-gradient-to-br from-amber-500 to-orange-600 rounded-full flex items-center justify-center text-white font-bold text-lg lg:text-xl xl:text-2xl">
                      M
                    </div>
                    <div className="ml-4 lg:ml-6">
                      <h4 className="font-bold text-gray-900 text-lg lg:text-xl xl:text-2xl">Michael Chen</h4>
                      <p className="text-gray-600 text-sm lg:text-base xl:text-lg">Farmer</p>
                    </div>
                  </div>
                  <div className="flex text-emerald-500 mb-4 lg:mb-6">
                    {[...Array(5)].map((_, i) => (
                      <svg key={i} className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 xl:w-7 xl:h-7 fill-current" viewBox="0 0 24 24">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                      </svg>
                    ))}
                  </div>
                  <p className="text-gray-700 italic leading-relaxed text-base lg:text-lg xl:text-xl">
                    "This platform has transformed my farming business. I now sell directly to customers and get fair prices for my hard work. The support team is amazing!"
                  </p>
                </div>
              </FadeIn>

              <FadeIn delay={0.4}>
                <div className="group bg-white rounded-2xl lg:rounded-3xl p-6 sm:p-8 lg:p-10 xl:p-12 shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2">
                  <div className="flex items-center mb-6 lg:mb-8">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 xl:w-20 xl:h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-lg lg:text-xl xl:text-2xl">
                      A
                    </div>
                    <div className="ml-4 lg:ml-6">
                      <h4 className="font-bold text-gray-900 text-lg lg:text-xl xl:text-2xl">Anna Rodriguez</h4>
                      <p className="text-gray-600 text-sm lg:text-base xl:text-lg">Customer</p>
                    </div>
                  </div>
                  <div className="flex text-emerald-500 mb-4 lg:mb-6">
                    {[...Array(5)].map((_, i) => (
                      <svg key={i} className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 xl:w-7 xl:h-7 fill-current" viewBox="0 0 24 24">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                      </svg>
                    ))}
                  </div>
                  <p className="text-gray-700 italic leading-relaxed text-base lg:text-lg xl:text-xl">
                    "I love supporting local farmers and knowing exactly where my food comes from. The platform makes it so easy to find fresh, seasonal produce in my area."
                  </p>
                </div>
              </FadeIn>
            </div>
          </div>
        </section>
      </FadeIn>

      {/* CTA Section */}
      <FadeIn>
        <section className="py-16 lg:py-24 xl:py-32 bg-gradient-to-r from-emerald-600 to-green-600">
          <div className="max-w-6xl mx-auto text-center px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16">
            <FadeIn delay={0.1}>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl 2xl:text-7xl font-bold text-white mb-4 lg:mb-6 xl:mb-8">
              Start Buying or Selling Today
            </h2>
            </FadeIn>
            <FadeIn delay={0.2}>
              <p className="text-lg sm:text-xl lg:text-2xl xl:text-3xl text-emerald-100 mb-8 lg:mb-12 xl:mb-16 leading-relaxed max-w-4xl mx-auto">
                Join thousands of farmers and customers who are already part of our growing community. Start buying or selling fresh produce today.
              </p>
            </FadeIn>
            <FadeIn delay={0.3}>
              <div className="flex flex-col sm:flex-row gap-4 lg:gap-6 xl:gap-8 justify-center items-center">
                <Link
                  to="/register"
                  className="bg-white text-emerald-600 px-8 lg:px-12 xl:px-16 py-4 lg:py-5 xl:py-6 rounded-xl font-bold text-lg lg:text-xl xl:text-2xl hover:bg-gray-50 transition-all duration-300 transform hover:scale-105 shadow-2xl hover:shadow-emerald-500/25 w-full sm:w-auto"
                >
                  Get Started Free
                </Link>
                <Link
                  to="/products"
                  className="border-2 border-white text-white px-8 lg:px-12 xl:px-16 py-4 lg:py-5 xl:py-6 rounded-xl font-bold text-lg lg:text-xl xl:text-2xl hover:bg-white hover:text-emerald-600 transition-all duration-300 transform hover:scale-105 shadow-xl hover:shadow-white/25 w-full sm:w-auto"
                >
                  Browse Products
                </Link>
              </div>
            </FadeIn>
          </div>
        </section>
      </FadeIn>

    </div>
  );
}

export default Home;
