import { useEffect, useRef, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useSocket } from "../context/SocketContext";
import { getChatConversations } from "../services/authService";
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
  const { socket } = useSocket();
  const cartShellRef = useRef(null);
  const isCustomer = user?.role === "customer";
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);

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

  useEffect(() => {
    if (!user) {
      setChatUnreadCount(0);
      return undefined;
    }

    const refreshUnreadCount = async () => {
      try {
        const response = await getChatConversations();
        const unreadTotal = (response.data.conversations || []).reduce(
          (total, conversation) => total + (conversation.unreadCount || 0),
          0
        );
        setChatUnreadCount(unreadTotal);
      } catch (_error) {
        setChatUnreadCount(0);
      }
    };

    refreshUnreadCount();

    if (!socket) {
      return undefined;
    }

    const handleChatRefresh = () => {
      refreshUnreadCount();
    };

    socket.on("chatMessage", handleChatRefresh);
    socket.on("receive_message", handleChatRefresh);
    socket.on("messagesRead", handleChatRefresh);
    socket.on("chatDeleted", handleChatRefresh);

    return () => {
      socket.off("chatMessage", handleChatRefresh);
      socket.off("receive_message", handleChatRefresh);
      socket.off("messagesRead", handleChatRefresh);
      socket.off("chatDeleted", handleChatRefresh);
    };
  }, [socket, user]);

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-gray-200 bg-white/95 shadow-lg backdrop-blur-lg">
        <div className="mx-auto max-w-7xl px-3 sm:px-5 lg:px-6">
          <div className="flex h-16 items-center justify-between gap-2 lg:h-[4.5rem] lg:gap-3 xl:gap-5">
            {/* Brand */}
            <NavLink
              to="/"
              className="group flex min-w-0 flex-shrink-0 items-center gap-2.5 transition-all duration-300 hover:scale-[1.01]"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 shadow-lg transition-all duration-300 group-hover:shadow-xl lg:h-11 lg:w-11">
                <span className="text-base font-bold text-white lg:text-lg">FM</span>
              </div>
              <div className="hidden min-w-0 sm:block">
                <h1 className="max-w-[200px] text-[0.98rem] font-bold leading-tight text-gray-900 transition-colors duration-300 group-hover:text-emerald-600 lg:max-w-[250px] lg:text-[1.06rem] xl:max-w-[320px]">
                  Farmer Marketplace 
                </h1>
                <p className="mt-0.5 text-[0.78rem] text-gray-600 transition-colors duration-300 group-hover:text-emerald-500 lg:text-[0.84rem]">
                  Fresh produce, nearby farmers
                </p>
              </div>
            </NavLink>

            {/* Desktop Navigation */}
            <div className="hidden flex-1 items-center justify-center gap-0.5 px-2 lg:flex xl:gap-1 xl:px-4">
              {links.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.end}
                  className={({ isActive }) =>
                    `relative rounded-xl px-3 py-2 text-[0.94rem] font-semibold transition-all duration-300 hover:scale-[1.01] xl:px-3.5 ${
                      isActive
                        ? "bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-xl"
                        : "text-gray-700 hover:text-emerald-600 hover:bg-emerald-50"
                    }`
                  }
                >
                  {link.label}
                  {link.to === "/chat" && chatUnreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1 text-[0.68rem] font-bold text-white shadow-lg">
                      {chatUnreadCount}
                    </span>
                  )}
                </NavLink>
              ))}
            </div>

            {/* User Actions */}
            <div className="flex flex-shrink-0 items-center gap-2 lg:gap-2.5">
              {/* User Info */}
              {user && (
                <div className="hidden items-center gap-2 rounded-2xl border border-emerald-100 bg-white/80 px-3 py-2 shadow-sm lg:flex">
                  <span className="rounded-full bg-gradient-to-r from-emerald-100 to-green-100 px-3 py-1 text-[0.84rem] font-semibold capitalize text-emerald-800">
                    {user.role}
                  </span>
                  <span className="hidden max-w-[110px] truncate text-[0.92rem] font-semibold text-gray-700 xl:inline">
                    {user.name}
                  </span>
                </div>
              )}

              {/* Cart Button */}
              {isCustomer && (
                <div className="relative" ref={cartShellRef}>
                  <button
                    type="button"
                    onClick={handleCartClick}
                    className={`relative flex items-center gap-2 rounded-xl px-3 py-2 font-semibold transition-all duration-300 hover:scale-[1.01] xl:px-3.5 ${
                      isCartOpen
                        ? "bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-lg"
                        : "bg-gray-100 hover:bg-emerald-50 text-gray-700 hover:text-emerald-600"
                    }`}
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                    <span className="hidden xl:inline text-[0.94rem]">Cart</span>
                    {cartCount > 0 && (
                      <span className="absolute -right-2 -top-2 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1 text-[0.7rem] font-bold text-white shadow-lg">
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
                  className="hidden items-center gap-2 rounded-xl bg-red-50 px-3 py-2 font-semibold text-red-600 transition-all duration-300 hover:scale-[1.01] hover:bg-red-100 hover:text-red-700 md:flex xl:px-3.5"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span className="hidden text-[0.94rem] xl:inline">Logout</span>
                </button>
              )}

              {/* Mobile Menu Button */}
              <button
                type="button"
                className="flex flex-col space-y-1 rounded-lg p-2 transition-colors duration-300 hover:bg-gray-100 lg:hidden"
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
          <div className={`lg:hidden overflow-hidden transition-all duration-300 ${isMenuOpen ? 'max-h-[32rem] opacity-100' : 'max-h-0 opacity-0'}`}>
            <div className="space-y-2 border-t border-gray-200 py-3">
              {links.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.end}
                  onClick={() => setIsMenuOpen(false)}
                  className={({ isActive }) =>
                    `block rounded-xl px-4 py-3 text-[0.98rem] font-semibold transition-all duration-300 ${
                      isActive
                        ? "bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-lg"
                        : "text-gray-700 hover:text-emerald-600 hover:bg-emerald-50"
                    }`
                  }
                >
                  <span className="relative inline-flex items-center">
                    {link.label}
                    {link.to === "/chat" && chatUnreadCount > 0 && (
                      <span className="ml-2 inline-flex min-h-[1.35rem] min-w-[1.35rem] items-center justify-center rounded-full bg-red-500 px-1 text-[0.68rem] font-bold text-white shadow-lg">
                        {chatUnreadCount}
                      </span>
                    )}
                  </span>
                </NavLink>
              ))}

              {/* Mobile User Actions */}
              {user && (
                <div className="space-y-3 px-4 py-2">
                  <div className="flex items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/40 px-3 py-3">
                    <span className="rounded-full bg-gradient-to-r from-emerald-100 to-green-100 px-3 py-1 text-[0.84rem] font-semibold capitalize text-emerald-800">
                      {user.role}
                    </span>
                    <span className="min-w-0 truncate text-[0.94rem] font-medium text-gray-700">{user.name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      handleLogout();
                      setIsMenuOpen(false);
                    }}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-50 px-4 py-3 font-semibold text-red-600 transition-all duration-300 hover:bg-red-100 hover:text-red-700"
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
