import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { formatPriceWithUnit, formatQuantityWithUnit } from "../utils/productUnits";

function CartFlyout({ isCustomer }) {
  const {
    cartItems,
    cartTotal,
    removeFromCart,
    increaseCartQuantity,
    decreaseCartQuantity,
    setIsCartOpen,
  } = useCart();

  return (
    <div className="absolute top-full right-0 mt-2 w-96 max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden z-50 animate-in slide-in-from-top-2 duration-300">
      <div className="bg-gradient-to-r from-emerald-500 to-green-600 px-6 py-4 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold">Your Cart</h3>
            <p className="text-emerald-100 text-sm">
              {cartItems.length} product{cartItems.length !== 1 ? "s" : ""} added
            </p>
          </div>
          <button
            type="button"
            className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors duration-300"
            onClick={() => setIsCartOpen(false)}
            aria-label="Close cart"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <div className="max-h-96 overflow-y-auto">
        {cartItems.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <h4 className="text-lg font-semibold text-gray-900 mb-2">Your cart is empty</h4>
            <p className="text-gray-600 text-sm">Add fresh products from nearby farmers to get started!</p>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {cartItems.map((item) => (
              <div key={item._id} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <div className="flex space-x-4">
                  <div className="w-16 h-16 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="flex-grow min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <div className="min-w-0 flex-grow">
                        <h4 className="font-semibold text-gray-900 text-sm line-clamp-2 leading-tight">
                          {item.name}
                        </h4>
                        <span className="inline-block px-2 py-1 bg-emerald-100 text-emerald-800 text-xs font-medium rounded-full mt-1 capitalize">
                          {item.category}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFromCart(item._id)}
                        className="text-red-500 hover:text-red-700 transition-colors duration-300 ml-2 flex-shrink-0"
                        aria-label={`Remove ${item.name} from cart`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>

                    <div className="flex items-center text-xs text-gray-600 mb-2">
                      <svg className="w-3 h-3 mr-1 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      {item.farmerId?.name || "Unknown farmer"}
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-600 text-sm">
                        {formatPriceWithUnit(item.price, item)}
                      </span>

                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => decreaseCartQuantity(item._id)}
                          className="w-8 h-8 bg-gray-200 hover:bg-gray-300 rounded-full flex items-center justify-center transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                          aria-label={`Decrease quantity of ${item.name}`}
                          disabled={item.quantityInCart <= 1}
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                          </svg>
                        </button>

                        <span className="min-w-[4rem] text-center font-semibold text-sm">
                          {formatQuantityWithUnit(item.quantityInCart, item)}
                        </span>

                        <button
                          type="button"
                          onClick={() => increaseCartQuantity(item._id)}
                          className="w-8 h-8 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full flex items-center justify-center transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                          aria-label={`Increase quantity of ${item.name}`}
                          disabled={item.quantityInCart >= item.quantity}
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    <div className="text-right mt-2">
                      <span className="text-xs text-gray-500">Subtotal: </span>
                      <span className="font-semibold text-gray-900 text-sm">
                        Rs. {item.price * item.quantityInCart}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {cartItems.length > 0 && (
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <div className="flex items-center justify-between mb-4">
            <span className="text-lg font-bold text-gray-900">Total</span>
            <span className="text-2xl font-bold text-emerald-600">Rs. {cartTotal}</span>
          </div>

          <Link
            to="/customer-dashboard#cart-summary"
            className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white px-6 py-3 rounded-xl font-bold text-center transition-all duration-300 transform hover:scale-105 hover:shadow-lg shadow-lg inline-block"
            onClick={() => setIsCartOpen(false)}
          >
            <div className="flex items-center justify-center space-x-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              <span>View Cart & Checkout</span>
            </div>
          </Link>
        </div>
      )}
    </div>
  );
}

export default CartFlyout;
