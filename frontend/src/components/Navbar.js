import { useEffect, useRef, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import CartFlyout from "./CartFlyout";

const guestLinks = [
  { to: "/", label: "Home", end: true },
  { to: "/products", label: "Products" },
  { to: "/login", label: "Login" },
  { to: "/register", label: "Register" },
];

function Navbar() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { cartCount, isCartOpen, setIsCartOpen, cartNotice } = useCart();
  const cartShellRef = useRef(null);
  const isCustomer = user?.role === "customer";
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navLinks = [
    { to: "/", label: "Home", end: true },
    { to: "/products", label: "Products" },
  ];

  if (user) {
    navLinks.push({
      to: user.role === "farmer" ? "/farmer-dashboard" : "/customer-dashboard",
      label: "Dashboard"
    });

    // Provide quick access to messaging for all signed-in users
    navLinks.push({
      to: "/chat",
      label: "Chat"
    });
  }

  const links = user ? navLinks : guestLinks;

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  useEffect(() => {
    if (!isCartOpen) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (cartShellRef.current && !cartShellRef.current.contains(event.target)) {
        setIsCartOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setIsCartOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isCartOpen, setIsCartOpen]);

  const handleCartClick = () => {
    if (!isCustomer) {
      return;
    }

    if (window.innerWidth <= 780) {
      setIsCartOpen(false);
      navigate("/customer-dashboard#cart-summary");
      return;
    }

    setIsCartOpen((prev) => !prev);
  };

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-lg border-b border-gray-200 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-20">
            {/* Brand */}
            <NavLink
              to="/"
              className="flex items-center space-x-3 group transition-all duration-300 hover:scale-105"
            >
              <div className="w-10 h-10 lg:w-12 lg:h-12 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300">
                <span className="text-white font-bold text-lg lg:text-xl">FM</span>
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg lg:text-xl font-bold text-gray-900 group-hover:text-emerald-600 transition-colors duration-300">
                  Farmer Marketplace developed by subodh singh
                </h1>
                <p className="text-xs lg:text-sm text-gray-600 group-hover:text-emerald-500 transition-colors duration-300">
                  Fresh produce, nearby farmers
                </p>
              </div>
            </NavLink>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center space-x-10">
              {links.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.end}
                  className={({ isActive }) =>
                    `px-5 py-2 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 ${
                      isActive
                        ? "bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-xl"
                        : "text-gray-700 hover:text-emerald-600 hover:bg-emerald-50"
                    }`
                  }
                >
                  {link.label}
                </NavLink>
              ))}
            </div>

            {/* User Actions */}
            <div className="flex items-center space-x-6">
              {/* User Info */}
              {user && (
                <div className="hidden md:flex items-center space-x-3">
                  <span className="px-3 py-1 bg-gradient-to-r from-emerald-100 to-green-100 text-emerald-800 text-sm font-semibold rounded-full capitalize">
                    {user.role}
                  </span>
                  <span className="text-gray-700 font-medium">{user.name}</span>
                </div>
              )}

              {/* Cart Button */}
              {isCustomer && (
                <div className="relative" ref={cartShellRef}>
                  <button
                    type="button"
                    onClick={handleCartClick}
                    className={`relative flex items-center space-x-2 px-4 py-2 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 ${
                      isCartOpen
                        ? "bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-lg"
                        : "bg-gray-100 hover:bg-emerald-50 text-gray-700 hover:text-emerald-600"
                    }`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                    <span>Cart</span>
                    {cartCount > 0 && (
                      <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shadow-lg">
                        {cartCount}
                      </span>
                    )}
                  </button>
                  {isCartOpen && <CartFlyout isCustomer={isCustomer} />}
                </div>
              )}

              {/* Logout Button */}
              {user && (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="hidden md:flex items-center space-x-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span>Logout</span>
                </button>
              )}

              {/* Mobile Menu Button */}
              <button
                type="button"
                className="lg:hidden flex flex-col space-y-1 p-2 rounded-lg hover:bg-gray-100 transition-colors duration-300"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                aria-label="Toggle menu"
              >
                <span className={`w-6 h-0.5 bg-gray-600 transition-all duration-300 ${isMenuOpen ? 'rotate-45 translate-y-1.5' : ''}`}></span>
                <span className={`w-6 h-0.5 bg-gray-600 transition-all duration-300 ${isMenuOpen ? 'opacity-0' : ''}`}></span>
                <span className={`w-6 h-0.5 bg-gray-600 transition-all duration-300 ${isMenuOpen ? '-rotate-45 -translate-y-1.5' : ''}`}></span>
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          <div className={`lg:hidden overflow-hidden transition-all duration-300 ${isMenuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
            <div className="py-4 space-y-2 border-t border-gray-200">
              {links.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.end}
                  onClick={() => setIsMenuOpen(false)}
                  className={({ isActive }) =>
                    `block px-4 py-3 rounded-lg font-semibold transition-all duration-300 ${
                      isActive
                        ? "bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-lg"
                        : "text-gray-700 hover:text-emerald-600 hover:bg-emerald-50"
                    }`
                  }
                >
                  {link.label}
                </NavLink>
              ))}

              {/* Mobile User Actions */}
              {user && (
                <div className="px-4 py-2 space-y-2">
                  <div className="flex items-center space-x-3">
                    <span className="px-3 py-1 bg-gradient-to-r from-emerald-100 to-green-100 text-emerald-800 text-sm font-semibold rounded-full capitalize">
                      {user.role}
                    </span>
                    <span className="text-gray-700 font-medium">{user.name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      handleLogout();
                      setIsMenuOpen(false);
                    }}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 rounded-lg font-semibold transition-all duration-300"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Cart Toast Notification */}
      {cartNotice && isCustomer && (
        <div className="fixed bottom-4 right-4 z-50 bg-gradient-to-r from-emerald-500 to-green-600 text-white px-6 py-4 rounded-2xl shadow-2xl border border-emerald-400 animate-in slide-in-from-right-4 duration-300">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="font-semibold">{cartNotice.message}</p>
              <p className="text-emerald-100 text-sm">{cartNotice.productName} added to cart</p>
            </div>
          </div>
        </div>
      )}

      {/* Spacer for fixed navbar */}
      <div className="h-16 lg:h-20"></div>
    </>
  );
}

export default Navbar;
