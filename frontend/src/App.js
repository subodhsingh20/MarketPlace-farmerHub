import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import { SocketProvider } from "./context/SocketContext";
import Navbar from "./components/Navbar";
import PublicPageLayout from "./components/PublicPageLayout";
import ScrollToTop from "./components/ScrollToTop";
import Chat from "./pages/Chat";
import CustomerDashboard from "./pages/CustomerDashboard";
import CustomerOrders from "./pages/CustomerOrders";
import FarmerDashboard from "./pages/FarmerDashboard";
import FarmerOrders from "./pages/FarmerOrders";
import Home from "./pages/Home";
import InfoPage from "./pages/InfoPage";
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

function PageTransition({ pageKey, children, className }) {
  return (
    <motion.div
      key={pageKey}
      className={className}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
    >
      {children}
    </motion.div>
  );
}

function OrdersRoute() {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return user.role === "farmer" ? <FarmerOrders /> : <CustomerOrders />;
}

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <CartProvider>
          <BrowserRouter>
            <div className="app-shell">
              <ScrollToTop />
              <Navbar />
              <AnimatePresence mode="wait">
                  <Routes>
                    <Route
                      path="/"
                      element={
                        <PageTransition pageKey="home" className="min-h-screen">
                          <PublicPageLayout mainClassName="page-shell--home">
                            <Home />
                          </PublicPageLayout>
                        </PageTransition>
                      }
                    />
                    <Route
                      path="/products"
                      element={
                        <PageTransition pageKey="products">
                          <PublicPageLayout>
                            <ProductListing />
                          </PublicPageLayout>
                        </PageTransition>
                      }
                    />
                    <Route
                      path="/become-seller"
                      element={
                        <PageTransition pageKey="become-seller">
                          <PublicPageLayout>
                            <InfoPage
                              eyebrow="Seller onboarding"
                              title="Become a Seller"
                              description="Set up your farmer storefront, publish produce listings, and start selling directly to nearby buyers with transparent pricing."
                              primaryAction={{ to: "/register", label: "Create Seller Account" }}
                              secondaryAction={{ to: "/products", label: "Browse Marketplace" }}
                              sections={[
                                {
                                  title: "Why join",
                                  body: "Farmer Marketplace helps growers list fresh produce, connect with local customers, and manage orders from one place. This page is ready as a clear destination for the footer link and can later be expanded into a full onboarding flow.",
                                },
                                {
                                  title: "What comes next",
                                  body: "You can turn this placeholder into a guided seller application, FAQ, or pricing comparison page. For now it gives visitors a clear path to registration and keeps navigation fully functional.",
                                },
                              ]}
                            />
                          </PublicPageLayout>
                        </PageTransition>
                      }
                    />
                    <Route
                      path="/how-it-works"
                      element={
                        <PageTransition pageKey="how-it-works">
                          <PublicPageLayout>
                            <InfoPage
                              eyebrow="Marketplace guide"
                              title="How It Works"
                              description="Explore the simple flow behind Farmer Marketplace, from discovering produce to connecting with trusted local farmers and placing orders."
                              primaryAction={{ to: "/products", label: "Browse Products" }}
                              secondaryAction={{ to: "/become-seller", label: "Become a Seller" }}
                              sections={[
                                {
                                  title: "For customers",
                                  body: "Browse products, compare nearby sellers, add items to your cart, and place orders with confidence. The marketplace is designed to make farm-fresh shopping feel straightforward on both desktop and mobile.",
                                },
                                {
                                  title: "For farmers",
                                  body: "Farmers can create listings, manage inventory, respond to buyers, and grow direct relationships with their customers. This placeholder route now gives the footer a real destination instead of relying on a homepage fragment.",
                                },
                              ]}
                            />
                          </PublicPageLayout>
                        </PageTransition>
                      }
                    />
                    <Route
                      path="/pricing"
                      element={
                        <PageTransition pageKey="pricing">
                          <PublicPageLayout>
                            <InfoPage
                              eyebrow="Plans"
                              title="Pricing"
                              description="Review the Farmer Marketplace pricing approach for customers, farmers, and future marketplace services."
                              primaryAction={{ to: "/become-seller", label: "Become a Seller" }}
                              secondaryAction={{ to: "/products", label: "Browse Products" }}
                              sections={[
                                {
                                  title: "For customers",
                                  body: "Customers can browse and order fresh produce directly from farmers. This placeholder page gives your pricing footer link a working route and can later be expanded into delivery fees, payment details, or promotional plans.",
                                },
                                {
                                  title: "For farmers",
                                  body: "Farmers can use this space in the future for commission details, onboarding fees, subscription tiers, or featured listing plans. For now, it provides a proper internal page instead of a broken footer destination.",
                                },
                              ]}
                            />
                          </PublicPageLayout>
                        </PageTransition>
                      }
                    />
                    <Route
                      path="/login"
                      element={
                        <PageTransition pageKey="login">
                          <PublicPageLayout>
                            <Login />
                          </PublicPageLayout>
                        </PageTransition>
                      }
                    />
                    <Route
                      path="/register"
                      element={
                        <PageTransition pageKey="register">
                          <PublicPageLayout>
                            <Register />
                          </PublicPageLayout>
                        </PageTransition>
                      }
                    />
                    <Route
                      path="/help"
                      element={
                        <PageTransition pageKey="help">
                          <PublicPageLayout>
                            <InfoPage
                              eyebrow="Support"
                              title="Help Center"
                              description="Find quick answers about browsing products, managing orders, seller onboarding, and using the Farmer Marketplace experience."
                              primaryAction={{ to: "/contact", label: "Contact Support" }}
                              secondaryAction={{ to: "/how-it-works", label: "Learn How It Works" }}
                              sections={[
                                {
                                  title: "Popular topics",
                                  body: "Use this page as the starting point for shipping questions, account help, order issues, and marketplace guidance. It is intentionally lightweight now so every footer link leads somewhere clear and usable.",
                                },
                                {
                                  title: "Support direction",
                                  body: "A future version can add searchable FAQs, issue categories, and self-service troubleshooting. For now, customers and sellers can move from here to the contact page or back into the core marketplace flow.",
                                },
                              ]}
                            />
                          </PublicPageLayout>
                        </PageTransition>
                      }
                    />
                    <Route
                      path="/contact"
                      element={
                        <PageTransition pageKey="contact">
                          <PublicPageLayout>
                            <InfoPage
                              eyebrow="Get in touch"
                              title="Contact Us"
                              description="Reach the Farmer Marketplace team for order support, seller onboarding questions, partnership requests, or general platform feedback."
                              primaryAction={{ to: "/help", label: "Visit Help Center" }}
                              secondaryAction={{ to: "/", label: "Back to Home" }}
                              sections={[
                                {
                                  title: "Customer support",
                                  body: "For assistance with browsing, ordering, or account access, direct customers here first. This placeholder makes the route active and gives the footer a dependable support destination.",
                                },
                                {
                                  title: "Business inquiries",
                                  body: "Farmers, cooperatives, and partners can later use this page for email, phone, or contact form details. The current content keeps navigation clear until those channels are added.",
                                },
                              ]}
                            />
                          </PublicPageLayout>
                        </PageTransition>
                      }
                    />
                    <Route
                      path="/privacy"
                      element={
                        <PageTransition pageKey="privacy">
                          <PublicPageLayout>
                            <InfoPage
                              eyebrow="Legal"
                              title="Privacy Policy"
                              description="Review how Farmer Marketplace may collect, use, and protect customer and seller information across the platform."
                              primaryAction={{ to: "/terms", label: "Read Terms" }}
                              secondaryAction={{ to: "/contact", label: "Ask a Question" }}
                              sections={[
                                {
                                  title: "Data handling overview",
                                  body: "This placeholder route can later be replaced with your full privacy notice covering account data, transaction details, analytics, and communication preferences.",
                                },
                                {
                                  title: "Why this page matters",
                                  body: "Legal footer links should never dead-end. This page now provides a clear destination and space for a proper policy when you are ready to finalize it.",
                                },
                              ]}
                            />
                          </PublicPageLayout>
                        </PageTransition>
                      }
                    />
                    <Route
                      path="/terms"
                      element={
                        <PageTransition pageKey="terms">
                          <PublicPageLayout>
                            <InfoPage
                              eyebrow="Legal"
                              title="Terms of Service"
                              description="Understand the basic rules, responsibilities, and expectations for using Farmer Marketplace as a customer or seller."
                              primaryAction={{ to: "/privacy", label: "Read Privacy Policy" }}
                              secondaryAction={{ to: "/contact", label: "Contact Us" }}
                              sections={[
                                {
                                  title: "Platform expectations",
                                  body: "This page can later describe buyer and seller responsibilities, order handling, prohibited behavior, and dispute processes. Right now it serves as a clear placeholder so footer navigation is complete.",
                                },
                                {
                                  title: "Next legal step",
                                  body: "When you are ready, replace this copy with your formal terms and keep the same route so existing links continue working without any extra app changes.",
                                },
                              ]}
                            />
                          </PublicPageLayout>
                        </PageTransition>
                      }
                    />
                    <Route
                      path="/orders"
                      element={
                        <PageTransition pageKey="orders">
                          <main className="page-shell">
                            <ProtectedRoute>
                              <OrdersRoute />
                            </ProtectedRoute>
                          </main>
                        </PageTransition>
                      }
                    />
                    <Route
                      path="/chat"
                      element={
                        <PageTransition pageKey="chat">
                          <main className="page-shell">
                            <ProtectedRoute>
                              <Chat />
                            </ProtectedRoute>
                          </main>
                        </PageTransition>
                      }
                    />
                    <Route
                      path="/farmer-dashboard"
                      element={
                        <PageTransition pageKey="farmer-dashboard">
                          <main className="page-shell">
                            <ProtectedRoute allowedRole="farmer">
                              <FarmerDashboard />
                            </ProtectedRoute>
                          </main>
                        </PageTransition>
                      }
                    />
                    <Route
                      path="/customer-dashboard"
                      element={
                        <PageTransition pageKey="customer-dashboard">
                          <main className="page-shell">
                            <ProtectedRoute allowedRole="customer">
                              <CustomerDashboard />
                            </ProtectedRoute>
                          </main>
                        </PageTransition>
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
