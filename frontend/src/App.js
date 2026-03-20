import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import { SocketProvider } from "./context/SocketContext";
import Navbar from "./components/Navbar";
import Chat from "./pages/Chat";
import CustomerDashboard from "./pages/CustomerDashboard";
import FarmerDashboard from "./pages/FarmerDashboard";
import Home from "./pages/Home";
import Login from "./pages/Login";
import ProductListing from "./pages/ProductListing";
import Register from "./pages/Register";
import "./App.css";

function ProtectedRoute({ allowedRole, children }) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRole && user.role !== allowedRole) {
    const redirectPath =
      user.role === "farmer" ? "/farmer-dashboard" : "/customer-dashboard";

    return <Navigate to={redirectPath} replace />;
  }

  return children;
}

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <CartProvider>
          <BrowserRouter>
            <div className="app-shell">
              <Navbar />
              <AnimatePresence mode="wait">
                  <Routes>
                    <Route
                      path="/"
                      element={
                        <motion.div
                          key="home"
                          className="page-shell--home min-h-screen"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          transition={{ duration: 0.3 }}
                        >
                          <Home />
                        </motion.div>
                      }
                    />
                    <Route
                      path="/products"
                      element={
                        <motion.div
                          key="products"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          transition={{ duration: 0.3 }}
                        >
                          <main className="page-shell">
                            <ProductListing />
                          </main>
                        </motion.div>
                      }
                    />
                    <Route
                      path="/login"
                      element={
                        <motion.div
                          key="login"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          transition={{ duration: 0.3 }}
                        >
                          <main className="page-shell">
                            <Login />
                          </main>
                        </motion.div>
                      }
                    />
                    <Route
                      path="/register"
                      element={
                        <motion.div
                          key="register"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          transition={{ duration: 0.3 }}
                        >
                          <main className="page-shell">
                            <Register />
                          </main>
                        </motion.div>
                      }
                    />
                    <Route
                      path="/chat"
                      element={
                        <motion.div
                          key="chat"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          transition={{ duration: 0.3 }}
                        >
                          <main className="page-shell">
                            <ProtectedRoute>
                              <Chat />
                            </ProtectedRoute>
                          </main>
                        </motion.div>
                      }
                    />
                    <Route
                      path="/farmer-dashboard"
                      element={
                        <motion.div
                          key="farmer-dashboard"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          transition={{ duration: 0.3 }}
                        >
                          <main className="page-shell">
                            <ProtectedRoute allowedRole="farmer">
                              <FarmerDashboard />
                            </ProtectedRoute>
                          </main>
                        </motion.div>
                      }
                    />
                    <Route
                      path="/customer-dashboard"
                      element={
                        <motion.div
                          key="customer-dashboard"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          transition={{ duration: 0.3 }}
                        >
                          <main className="page-shell">
                            <ProtectedRoute allowedRole="customer">
                              <CustomerDashboard />
                            </ProtectedRoute>
                          </main>
                        </motion.div>
                      }
                    />
                  </Routes>
                </AnimatePresence>
            </div>
          </BrowserRouter>
        </CartProvider>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;
