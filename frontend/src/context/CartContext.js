import { createContext, useContext, useEffect, useMemo, useState } from "react";

const CartContext = createContext(null);
const CART_KEY = "cart";

function getStoredCart() {
  const storedCart = localStorage.getItem(CART_KEY);

  if (!storedCart) {
    return [];
  }

  try {
    const parsedCart = JSON.parse(storedCart);
    return Array.isArray(parsedCart) ? parsedCart : [];
  } catch (_error) {
    localStorage.removeItem(CART_KEY);
    return [];
  }
}

export function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState(() => getStoredCart());
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cartNotice, setCartNotice] = useState(null);

  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(cartItems));
  }, [cartItems]);

  useEffect(() => {
    if (!cartNotice) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setCartNotice(null);
    }, 2400);

    return () => window.clearTimeout(timeoutId);
  }, [cartNotice]);

  const showCartNotice = (message, product) => {
    setCartNotice({
      id: Date.now(),
      message,
      productName: product.name,
    });
  };

  const addToCart = (product) => {
    setCartItems((current) => {
      const existingItem = current.find((item) => item._id === product._id);

      if (existingItem) {
        showCartNotice("Cart updated.", product);
        return current.map((item) =>
          item._id === product._id
            ? {
                ...item,
                quantityInCart: Math.min(item.quantityInCart + 1, item.quantity),
              }
            : item
        );
      }

      showCartNotice("Item added to cart.", product);
      return [...current, { ...product, quantityInCart: 1 }];
    });
  };

  const removeFromCart = (productId) => {
    setCartItems((current) => current.filter((item) => item._id !== productId));
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const updateCartQuantity = (productId, nextQuantity) => {
    if (nextQuantity <= 0) {
      removeFromCart(productId);
      return;
    }

    setCartItems((current) =>
      current.map((item) =>
        item._id === productId
          ? {
              ...item,
              quantityInCart: Math.min(nextQuantity, item.quantity),
            }
          : item
      )
    );
  };

  const increaseCartQuantity = (productId) => {
    const cartItem = cartItems.find((item) => item._id === productId);

    if (!cartItem || cartItem.quantityInCart >= cartItem.quantity) {
      return;
    }

    updateCartQuantity(productId, cartItem.quantityInCart + 1);
  };

  const decreaseCartQuantity = (productId) => {
    const cartItem = cartItems.find((item) => item._id === productId);

    if (!cartItem) {
      return;
    }

    updateCartQuantity(productId, cartItem.quantityInCart - 1);
  };

  const cartCount = useMemo(
    () => cartItems.reduce((total, item) => total + item.quantityInCart, 0),
    [cartItems]
  );

  const cartTotal = useMemo(
    () =>
      cartItems.reduce(
        (total, item) => total + item.price * item.quantityInCart,
        0
      ),
    [cartItems]
  );

  return (
    <CartContext.Provider
      value={{
        cartItems,
        cartCount,
        cartTotal,
        addToCart,
        removeFromCart,
        updateCartQuantity,
        increaseCartQuantity,
        decreaseCartQuantity,
        clearCart,
        isCartOpen,
        setIsCartOpen,
        cartNotice,
        setCartNotice,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
