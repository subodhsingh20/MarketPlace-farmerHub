import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import ContactOptions from "./ContactOptions";
import ProductImage from "./ProductImage";
import { formatAvailableStock, formatPriceWithUnit } from "../utils/productUnits";

const ProductCard = ({ product, isCustomer, getCartQuantity, addToCart }) => {
  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i += 1) {
      stars.push(
        <svg key={i} className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 24 24">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      );
    }

    if (hasHalfStar) {
      stars.push(
        <svg key="half" className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 24 24">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77V2z" />
        </svg>
      );
    }

    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i += 1) {
      stars.push(
        <svg key={`empty-${i}`} className="w-4 h-4 text-gray-300 fill-current" viewBox="0 0 24 24">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      );
    }

    return stars;
  };

  return (
    <motion.article
      className="group relative flex h-full flex-col justify-between overflow-hidden rounded-3xl border border-white/70 bg-white/95 shadow-[0_14px_40px_rgba(15,23,42,0.08)] backdrop-blur-sm transition-shadow duration-300 hover:shadow-[0_22px_60px_rgba(15,23,42,0.16)]"
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.35 }}
      whileHover={{ y: -6, scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
    >
      <div className="relative h-48 overflow-hidden bg-gradient-to-br from-slate-100 via-white to-emerald-50">
        <ProductImage
          src={product.imageUrl}
          alt={product.name}
          productName={product.name}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
          fallbackClassName="w-full h-full object-cover p-6"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/25 via-transparent to-transparent" />
        <div className="absolute top-3 right-3">
          <span className="inline-block rounded-full bg-gradient-to-r from-emerald-500 to-green-600 px-3 py-1 text-xs font-bold text-white shadow-lg">
            {product.category}
          </span>
        </div>
      </div>

      <div className="flex flex-grow flex-col p-6">
        <div className="mb-4">
          <h3 className="mb-2 line-clamp-2 text-xl font-bold leading-tight text-gray-900">
            {product.name}
          </h3>
          <div className="mb-3 flex items-center space-x-2">
            <div className="flex items-center space-x-1">
              {renderStars(product.averageRating || 0)}
            </div>
            <span className="text-sm font-medium text-gray-600">
              ({product.averageRating?.toFixed(1) || 0})
            </span>
          </div>
        </div>

        <div className="mb-4">
          <span className="text-3xl font-bold text-emerald-600">
            {formatPriceWithUnit(product.price, product)}
          </span>
        </div>

        <div className="mb-6 flex-grow space-y-2">
          <div className="flex items-center text-sm text-gray-600">
            <svg className="w-4 h-4 mr-2 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="font-medium">{product.farmerId?.name || "Unknown farmer"}</span>
          </div>

          <div className="flex items-center text-sm text-gray-600">
            <svg className="w-4 h-4 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>
              {product.location
                ? `${product.location.latitude.toFixed(2)}, ${product.location.longitude.toFixed(2)}`
                : "Location unknown"}
            </span>
          </div>

          <div className="flex items-center text-sm text-gray-600">
            <svg className="w-4 h-4 mr-2 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <span className="font-medium">{formatAvailableStock(product.quantity, product)}</span>
          </div>
        </div>

        <div className="mt-auto space-y-4">
          {product.farmerId?._id && (
            <ContactOptions
              farmerId={product.farmerId._id}
              farmerName={product.farmerId?.name || "Farmer"}
              phone={product.farmerId?.phone}
              chatLabel="Chat"
            />
          )}

          {isCustomer ? (
            <button
              type="button"
              className={`w-full py-3 px-6 rounded-xl font-bold text-white transition-all duration-300 transform hover:scale-105 hover:shadow-lg ${
                getCartQuantity(product._id) >= product.quantity
                  ? "bg-gray-400 cursor-not-allowed shadow-md"
                  : "bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 shadow-lg"
              }`}
              onClick={() => addToCart(product)}
              disabled={getCartQuantity(product._id) >= product.quantity}
            >
              <div className="flex items-center justify-center space-x-2">
                {getCartQuantity(product._id) >= product.quantity ? (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Maximum Added</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                    <span>Add to Cart</span>
                  </>
                )}
              </div>
            </button>
          ) : (
            <Link
              to="/login"
              className="block w-full rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 px-6 py-3 text-center font-bold text-white shadow-lg transition-all duration-300 hover:scale-105 hover:from-emerald-700 hover:to-green-700 hover:shadow-xl"
            >
              <div className="flex items-center justify-center space-x-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
                <span>Login to Order</span>
              </div>
            </Link>
          )}
        </div>
      </div>
    </motion.article>
  );
};

export default ProductCard;
