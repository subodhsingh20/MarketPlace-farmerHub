const crypto = require("crypto");
const { orders, products, users } = require("../data");
const { emitOrderAlert } = require("../socket");
const { getIo } = require("../socketInstance");
const {
  mergeRequestedProducts,
  populateOrder,
  reserveOrderStock,
} = require("../services/orderService");

const DEFAULT_PAYMENT_MODE = process.env.PAYMENT_MODE === "live" ? "live" : "test";

const normalizeSelectedAddress = (address) => ({
  addressId: address._id || address.addressId || null,
  label: String(address.label || "").trim(),
  name: String(address.name || "").trim(),
  street: String(address.street || "").trim(),
  city: String(address.city || "").trim(),
  state: String(address.state || "").trim(),
  pincode: String(address.pincode || "").trim(),
});

const getValidatedAddressData = async (userId, selectedAddressId, selectedAddress) => {
  if (selectedAddressId) {
    const user = await users.findById(userId);

    if (!user) {
      throw new Error("User not found.");
    }

    const addressIndex = (user?.addresses || []).findIndex(
      (entry) => String(entry._id) === String(selectedAddressId)
    );

    if (addressIndex < 0) {
      throw new Error("Selected address was not found.");
    }

    const updatedAddresses = [...user.addresses];
    updatedAddresses[addressIndex] = {
      ...updatedAddresses[addressIndex],
      lastUsedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await users.updateById(userId, (doc) => ({
      ...doc,
      addresses: updatedAddresses,
    }));

    return normalizeSelectedAddress(updatedAddresses[addressIndex]);
  }

  const normalizedAddress = normalizeSelectedAddress(selectedAddress || {});
  const isComplete = [
    normalizedAddress.label,
    normalizedAddress.name,
    normalizedAddress.street,
    normalizedAddress.city,
    normalizedAddress.state,
    normalizedAddress.pincode,
  ].every(Boolean);

  if (!isComplete) {
    throw new Error("A complete address is required for checkout.");
  }

  return normalizedAddress;
};

const getValidatedOrderData = async (
  userId,
  requestedProducts,
  fulfillmentType,
  selectedAddressId,
  selectedAddress
) => {
  if (!Array.isArray(requestedProducts) || requestedProducts.length === 0) {
    throw new Error("Order must include products.");
  }

  if (!["pickup", "delivery"].includes(fulfillmentType)) {
    throw new Error("Fulfillment type must be either pickup or delivery.");
  }

  const mergedProducts = mergeRequestedProducts(requestedProducts);
  const productIds = mergedProducts.map((item) => item.productId);
  const foundProducts = await Promise.all(
    [...new Set(productIds)].map((productId) => products.findById(productId))
  );
  const foundProductMap = new Map(
    foundProducts.filter(Boolean).map((product) => [String(product._id), product])
  );

  const normalizedProducts = [];
  let totalPrice = 0;

  for (const item of mergedProducts) {
    const product = foundProductMap.get(String(item.productId));
    const quantity = Number(item.quantity);

    if (!product) {
      throw new Error(`Product not found for id ${item.productId}.`);
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new Error(`Invalid quantity for product ${product.name}.`);
    }

    if (product.quantity < quantity) {
      throw new Error(`Insufficient quantity available for ${product.name}.`);
    }

    normalizedProducts.push({
      productId: product._id,
      quantity,
      price: product.price,
      unit: product.unit,
    });

    totalPrice += product.price * quantity;
  }

  const shippingAddress = await getValidatedAddressData(
    userId,
    selectedAddressId,
    selectedAddress
  );

  return { normalizedProducts, shippingAddress, totalPrice };
};

const emitPaidOrderAlert = async (order, userId, message) => {
  const populatedOrder = await populateOrder(order);
  const farmerIds = [
    ...new Set(
      populatedOrder.products
        .map((item) => item.productId?.farmerId)
        .filter(Boolean)
        .map((farmerId) => String(farmerId._id || farmerId))
    ),
  ];

  emitOrderAlert(getIo(), {
    type: "order_paid",
    orderId: populatedOrder._id,
    customerId: userId,
    farmerIds,
    message,
    status: populatedOrder.status,
  });

  return populatedOrder;
};

const finalizeOrderPayment = async ({
  order,
  paymentReference,
  paymentProvider,
  paymentMode,
  successMessage,
}) => {
  if (order.paymentStatus === "paid") {
    return {
      alreadyPaid: true,
      order: await emitPaidOrderAlert(order, order.userId, successMessage),
    };
  }

  await reserveOrderStock(order);

  const updatedOrder = await orders.updateById(order._id, (doc) => {
    const nextOrder = {
      ...doc,
      paymentStatus: "paid",
      status: "pending",
      paymentReference,
      paymentProvider,
      paymentMode,
    };

    if (paymentProvider === "razorpay") {
      nextOrder.razorpayPaymentId = paymentReference;
    }

    return nextOrder;
  });

  return {
    alreadyPaid: false,
    order: await emitPaidOrderAlert(updatedOrder, updatedOrder.userId, successMessage),
  };
};

const createPaymentOrder = async (req, res) => {
  try {
    if (DEFAULT_PAYMENT_MODE !== "live") {
      return res.status(400).json({
        message:
          "Live gateway is disabled. Set PAYMENT_MODE=live or use /api/payment/mock in test mode.",
      });
    }

    const { products, fulfillmentType, selectedAddressId, selectedAddress } = req.body;
    const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!razorpayKeyId || !razorpayKeySecret) {
      return res.status(500).json({
        message: "Razorpay credentials are not configured.",
      });
    }

    const { normalizedProducts, shippingAddress, totalPrice } = await getValidatedOrderData(
      req.user._id,
      products,
      fulfillmentType,
      selectedAddressId,
      selectedAddress
    );

    const amountInPaise = Math.round(totalPrice * 100);
    const receipt = `rcpt_${Date.now()}_${req.user._id}`;

    const response = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(
          `${razorpayKeyId}:${razorpayKeySecret}`
        ).toString("base64")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: amountInPaise,
        currency: "INR",
        receipt,
        notes: {
          userId: String(req.user._id),
          fulfillmentType,
        },
      }),
    });

    const razorpayOrder = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        message: "Failed to create Razorpay order.",
        error: razorpayOrder.error?.description || "Unknown Razorpay error.",
      });
    }

    const order = await orders.create({
      userId: req.user._id,
      products: normalizedProducts,
      totalPrice,
      fulfillmentType,
      shippingAddress,
      paymentStatus: "created",
      paymentProvider: "razorpay",
      paymentMode: "live",
      razorpayOrderId: razorpayOrder.id,
    });

    return res.status(201).json({
      message: "Payment order created successfully.",
      gateway: "razorpay",
      mode: "live",
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      keyId: razorpayKeyId,
      orderId: order._id,
    });
  } catch (error) {
    return res.status(400).json({
      message: "Failed to create payment order.",
      error: error.message,
    });
  }
};

const verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id: razorpayOrderId,
      razorpay_payment_id: razorpayPaymentId,
      razorpay_signature: razorpaySignature,
    } = req.body;

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return res.status(400).json({
        message: "Payment verification fields are required.",
      });
    }

    const secret = process.env.RAZORPAY_KEY_SECRET;

    if (!secret) {
      return res.status(500).json({
        message: "Razorpay secret is not configured.",
      });
    }

    const generatedSignature = crypto
      .createHmac("sha256", secret)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest("hex");

    if (generatedSignature !== razorpaySignature) {
      return res.status(400).json({
        message: "Payment signature verification failed.",
      });
    }

    const order = await orders.findOne({
      razorpayOrderId,
      userId: String(req.user._id),
    });

    if (!order) {
      return res.status(404).json({ message: "Pending order not found." });
    }

    const result = await finalizeOrderPayment({
      order,
      paymentReference: razorpayPaymentId,
      paymentProvider: "razorpay",
      paymentMode: "live",
      successMessage: "Payment verified and awaiting farmer confirmation.",
    });

    return res.status(200).json({
      message: result.alreadyPaid
        ? "Payment already verified."
        : "Payment verified successfully.",
      order: result.order,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to verify payment.",
      error: error.message,
    });
  }
};

const mockPayment = async (req, res) => {
  try {
    const { products, fulfillmentType, selectedAddressId, selectedAddress } = req.body;
    const { normalizedProducts, shippingAddress, totalPrice } = await getValidatedOrderData(
      req.user._id,
      products,
      fulfillmentType,
      selectedAddressId,
      selectedAddress
    );

    const transactionId = String(Date.now());

    const order = await orders.create({
      userId: req.user._id,
      products: normalizedProducts,
      totalPrice,
      fulfillmentType,
      shippingAddress,
      paymentStatus: "created",
      paymentProvider: "mock",
      paymentMode: "test",
    });

    const result = await finalizeOrderPayment({
      order,
      paymentReference: transactionId,
      paymentProvider: "mock",
      paymentMode: "test",
      successMessage: "Payment successful in test mode and awaiting farmer confirmation.",
    });

    return res.status(200).json({
      status: "success",
      transactionId: Number(transactionId),
      mode: "test",
      order: result.order,
    });
  } catch (error) {
    return res.status(400).json({
      message: "Mock payment failed.",
      error: error.message,
    });
  }
};

const createCashOnDeliveryOrder = async (req, res) => {
  try {
    const { products, fulfillmentType, selectedAddressId, selectedAddress } = req.body;
    const { normalizedProducts, shippingAddress, totalPrice } = await getValidatedOrderData(
      req.user._id,
      products,
      fulfillmentType,
      selectedAddressId,
      selectedAddress
    );

    const order = await orders.create({
      userId: req.user._id,
      products: normalizedProducts,
      totalPrice,
      fulfillmentType,
      shippingAddress,
      paymentStatus: "created",
      paymentProvider: "cod",
      paymentMode: "cod",
      status: "pending",
    });

    await reserveOrderStock(order);

    const populatedOrder = await populateOrder(order);
    const farmerIds = [
      ...new Set(
        populatedOrder.products
          .map((item) => item.productId?.farmerId)
          .filter(Boolean)
          .map((farmerId) => String(farmerId._id || farmerId))
      ),
    ];

    emitOrderAlert(getIo(), {
      type: "order_cod_created",
      orderId: populatedOrder._id,
      customerId: req.user._id,
      farmerIds,
      message: "A new cash on delivery order has been placed.",
      status: populatedOrder.status,
    });

    return res.status(201).json({
      message: "Cash on delivery order placed successfully.",
      order: populatedOrder,
    });
  } catch (error) {
    return res.status(400).json({
      message: "Failed to place cash on delivery order.",
      error: error.message,
    });
  }
};

module.exports = {
  createCashOnDeliveryOrder,
  createPaymentOrder,
  mockPayment,
  verifyPayment,
};
