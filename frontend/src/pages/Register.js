import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { registerUser, setAuthToken } from "../services/authService";
import FadeIn from "../components/FadeIn";

function Register() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    role: "customer",
    latitude: "",
    longitude: "",
  });
  const [error, setError] = useState("");
  const [locationMessage, setLocationMessage] = useState("");
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setLocationMessage("Geolocation is not supported by your browser.");
      return;
    }

    setIsFetchingLocation(true);
    setLocationMessage("");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData((current) => ({
          ...current,
          latitude: String(position.coords.latitude),
          longitude: String(position.coords.longitude),
        }));
        setLocationMessage("Current location captured successfully.");
        setIsFetchingLocation(false);
      },
      (locationError) => {
        setLocationMessage(
          locationError.message || "Unable to fetch your current location."
        );
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
    setError("");
    setIsSubmitting(true);

    try {
      const payload = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        role: formData.role,
        location: {
          latitude: Number(formData.latitude),
          longitude: Number(formData.longitude),
        },
      };

      const response = await registerUser(payload);
      const { token, user } = response.data;

      login({ token, user });
      setAuthToken(token);
      navigate(user.role === "farmer" ? "/farmer-dashboard" : "/customer-dashboard");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Registration failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-emerald-950 to-slate-900 flex items-center justify-center px-4 py-12">
      <FadeIn>
        <div className="max-w-7xl mx-auto w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-start">
            {/* Left: Form Section */}
            <div className="space-y-8">
              <FadeIn delay={0.1}>
                <div>
                  <span className="inline-block px-4 py-2 bg-white/10 text-emerald-200 text-sm font-semibold rounded-full mb-6 backdrop-blur-md">Create account</span>
                  <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight tracking-tight">Join the marketplace as a farmer or customer.</h1>
                  <p className="text-xl text-slate-300 leading-relaxed max-w-lg">
                    Set up your profile, save your current location, and unlock the right dashboard experience from the start.
                  </p>
                </div>
              </FadeIn>

              <FadeIn delay={0.2}>
                <div className="premium-panel p-8 lg:p-12">
                  <form className="space-y-6" onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label htmlFor="name" className="block text-sm font-semibold text-slate-700 mb-2">
                          Full Name
                        </label>
                        <input
                          id="name"
                          type="text"
                          name="name"
                          placeholder="Your full name"
                          value={formData.name}
                          onChange={handleChange}
                          required
                          className="w-full px-4 py-3 premium-input transition-all duration-300 text-gray-900 placeholder-gray-500"
                        />
                      </div>

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
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label htmlFor="phone" className="block text-sm font-semibold text-slate-700 mb-2">
                          Phone Number
                        </label>
                        <input
                          id="phone"
                          type="tel"
                          name="phone"
                          placeholder="9876543210"
                          value={formData.phone}
                          onChange={handleChange}
                          required
                          className="w-full px-4 py-3 premium-input transition-all duration-300 text-gray-900 placeholder-gray-500"
                        />
                      </div>

                      <div>
                        <label htmlFor="role" className="block text-sm font-semibold text-slate-700 mb-2">
                          I am a
                        </label>
                        <select
                          id="role"
                          name="role"
                          value={formData.role}
                          onChange={handleChange}
                          className="w-full px-4 py-3 premium-input transition-all duration-300 text-gray-900 bg-white"
                        >
                          <option value="customer">Customer</option>
                          <option value="farmer">Farmer</option>
                        </select>
                      </div>
                    </div>

                    <div>
                        <label htmlFor="password" className="block text-sm font-semibold text-slate-700 mb-2">
                        Password
                      </label>
                      <input
                        id="password"
                        type="password"
                        name="password"
                        placeholder="Create a strong password"
                        value={formData.password}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-3 premium-input transition-all duration-300 text-gray-900 placeholder-gray-500"
                      />
                    </div>

                    {/* Location Section */}
                    <FadeIn delay={0.1}>
                      <div className="rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-lime-50 p-6 shadow-[0_18px_40px_rgba(16,185,129,0.08)]">
                        <div className="flex items-center mb-4">
                          <svg className="w-5 h-5 text-emerald-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <h3 className="text-lg font-semibold text-slate-950">Location Setup</h3>
                        </div>

                        <p className="text-slate-600 text-sm mb-4">
                          Your location helps us show you nearby farmers and fresh produce.
                        </p>

                        <button
                          type="button"
                          onClick={handleGetLocation}
                          disabled={isFetchingLocation}
                          className="premium-button w-full mb-4 bg-gradient-to-r from-emerald-400 to-lime-500 px-6 py-3 font-semibold text-slate-950 shadow-[0_20px_40px_rgba(16,185,129,0.26)] disabled:cursor-not-allowed disabled:opacity-50 disabled:transform-none"
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

                        {locationMessage && (
                          <div className={`p-3 rounded-lg text-sm font-medium ${
                            locationMessage.includes("successfully")
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-rose-50 text-rose-700 border border-rose-200"
                          }`}>
                            {locationMessage}
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-4 mt-4">
                          <div>
                            <label htmlFor="latitude" className="block text-xs font-medium text-slate-700 mb-1">
                              Latitude
                            </label>
                            <input
                              id="latitude"
                              type="number"
                              name="latitude"
                              step="any"
                              placeholder="28.6139"
                              value={formData.latitude}
                              onChange={handleChange}
                              required
                              className="w-full px-3 py-2 text-sm premium-input transition-all duration-300"
                            />
                          </div>
                          <div>
                            <label htmlFor="longitude" className="block text-xs font-medium text-slate-700 mb-1">
                              Longitude
                            </label>
                            <input
                              id="longitude"
                              type="number"
                              name="longitude"
                              step="any"
                              placeholder="77.2090"
                              value={formData.longitude}
                              onChange={handleChange}
                              required
                              className="w-full px-3 py-2 text-sm premium-input transition-all duration-300"
                            />
                          </div>
                        </div>
                      </div>
                    </FadeIn>

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
                      className="premium-button w-full bg-gradient-to-r from-emerald-400 to-lime-500 px-8 py-4 text-lg font-bold text-slate-950 shadow-[0_20px_40px_rgba(16,185,129,0.26)] hover:shadow-[0_24px_48px_rgba(16,185,129,0.32)] disabled:cursor-not-allowed disabled:opacity-50 disabled:transform-none"
                    >
                      {isSubmitting ? (
                        <div className="flex items-center justify-center">
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Creating account...
                        </div>
                      ) : (
                        "Create Account"
                      )}
                    </button>
                  </form>

                  <FadeIn delay={0.3}>
                    <div className="mt-8 text-center">
                      <p className="text-slate-500">
                        Already have an account?{" "}
                        <Link
                          to="/login"
                          className="font-semibold text-emerald-700 underline decoration-emerald-300/80 underline-offset-4 transition-colors duration-300 hover:text-emerald-800"
                        >
                          Sign in here
                        </Link>
                      </p>
                    </div>
                  </FadeIn>
                </div>
              </FadeIn>
            </div>

            {/* Right: Content Section */}
            <FadeIn delay={0.4} direction="left">
              <div className="space-y-8 lg:mt-20">
                <div className="bg-white rounded-2xl lg:rounded-3xl p-8 lg:p-12 shadow-2xl border border-gray-100">
                  <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-emerald-500 to-green-600 rounded-full mb-6">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">What you unlock</h3>
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0 w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-1">Farmer Dashboard</h4>
                        <p className="text-gray-600 text-sm">Publish inventory, track orders, and monitor earnings with ease.</p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0 w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-1">Customer Experience</h4>
                        <p className="text-gray-600 text-sm">Browse by location, rate sellers, and checkout faster than ever.</p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0 w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-1">Smart Location Features</h4>
                        <p className="text-gray-600 text-sm">Your saved coordinates help surface nearby products intelligently.</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-center">
                  <Link to="/" className="inline-flex items-center text-emerald-600 hover:text-emerald-700 font-semibold transition-colors duration-300">
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

export default Register;
