import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { loginUser, setAuthToken } from "../services/authService";
import FadeIn from "../components/FadeIn";

function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await loginUser(formData);
      const { token, user } = response.data;

      login({ token, user });
      setAuthToken(token);
      navigate(user.role === "farmer" ? "/farmer-dashboard" : "/customer-dashboard");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Login failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-emerald-950 to-slate-900 flex items-center justify-center px-4 py-12">
      <FadeIn>
        <div className="max-w-6xl mx-auto w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Left: Form Section */}
            <div className="space-y-8">
              <FadeIn delay={0.1}>
                <div>
                  <span className="inline-block px-4 py-2 bg-white/10 text-emerald-200 text-sm font-semibold rounded-full mb-6 backdrop-blur-md">Welcome back</span>
                  <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight tracking-tight">Sign in and continue your market flow.</h1>
                  <p className="text-xl text-slate-300 leading-relaxed max-w-lg">
                    Access your farmer or customer dashboard, orders, cart, and chat in one place.
                  </p>
                </div>
              </FadeIn>

              <FadeIn delay={0.2}>
                <div className="premium-panel p-8 lg:p-12">
                  <form className="space-y-6" onSubmit={handleSubmit}>
                    <div>
                      <label htmlFor="email" className="block text-sm font-semibold text-slate-700 mb-2">
                        Email Address
                      </label>
                      <input
                        id="email"
                        type="email"
                        name="email"
                        placeholder="you@example.com"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-3 premium-input transition-all duration-300 text-gray-900 placeholder-gray-500"
                      />
                    </div>

                    <div>
                      <label htmlFor="password" className="block text-sm font-semibold text-slate-700 mb-2">
                        Password
                      </label>
                      <input
                        id="password"
                        type="password"
                        name="password"
                        placeholder="Enter your password"
                        value={formData.password}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-3 premium-input transition-all duration-300 text-gray-900 placeholder-gray-500"
                      />
                    </div>

                    {error && (
                      <FadeIn delay={0.1}>
                        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
                          <div className="flex items-center">
                            <svg className="w-5 h-5 text-rose-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <p className="font-medium text-rose-700">{error}</p>
                          </div>
                        </div>
                      </FadeIn>
                    )}

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="premium-button w-full bg-gradient-to-r from-emerald-500 to-lime-500 px-8 py-4 text-lg font-bold text-slate-950 shadow-[0_20px_40px_rgba(16,185,129,0.28)] hover:shadow-[0_24px_48px_rgba(16,185,129,0.34)] disabled:cursor-not-allowed disabled:opacity-50 disabled:transform-none"
                    >
                      {isSubmitting ? (
                        <div className="flex items-center justify-center">
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Signing in...
                        </div>
                      ) : (
                        "Sign In"
                      )}
                    </button>
                  </form>

                  <FadeIn delay={0.3}>
                    <div className="mt-8 text-center">
                      <p className="text-slate-500">
                        Don't have an account?{" "}
                        <Link
                          to="/register"
                          className="font-semibold text-emerald-700 underline decoration-emerald-300/80 underline-offset-4 transition-colors duration-300 hover:text-emerald-800"
                        >
rr                          Create one here
                        </Link>
                      </p>
                    </div>
                  </FadeIn>
                </div>
              </FadeIn>
            </div>

              {/* Right: Content Section */}
              <FadeIn delay={0.4} direction="left">
                <div className="space-y-8">
                <div className="premium-panel p-8 lg:p-12">
                  <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-emerald-400 via-emerald-500 to-lime-500 rounded-2xl mb-6 shadow-[0_14px_30px_rgba(16,185,129,0.28)]">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <h3 className="text-2xl font-bold text-slate-950 mb-4 tracking-tight">Why this dashboard helps</h3>
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0 w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-950 mb-1">Less clutter, faster action</h4>
                        <p className="text-slate-500 text-sm">Customers can move from discovery to checkout with clearer flows.</p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0 w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-950 mb-1">Better control center</h4>
                        <p className="text-slate-500 text-sm">Farmers get a more readable control center for products and orders.</p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0 w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-950 mb-1">Live alerts and messaging</h4>
                        <p className="text-slate-500 text-sm">Keep the marketplace active in real time with instant notifications.</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-center">
                  <Link to="/" className="inline-flex items-center font-semibold text-emerald-200 transition-colors duration-300 hover:text-white">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Back to Home
                  </Link>
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </FadeIn>
    </div>
  );
}

export default Login;
