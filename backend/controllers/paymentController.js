const crypto = require("crypto");
const Order = require("../models/Order");
const Product = require("../models/Product");
const { emitOrderAlert } = require("../socket");
const { getIo } = require("../socketInstance");
const User = require("../models/User");

const DEFAULT_PAYMENT_MODE = process.env.PAYMENT_MODE === "live" ? "live" : "test";

const mergeRequestedProducts = (products) => {
  const mergedProducts = new Map();

  for (const item of products) {
    const productId = String(item.productId);
    const quantity = Number(item.quantity);

    if (!mergedProducts.has(productId)) {
      mergedProducts.set(productId, {
        productId,
        quantity: 0,
      });
    }

    mergedProducts.get(productId).quantity += quantity;
  }

  return Array.from(mergedProducts.values());
};

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
    const user = await User.findById(userId).select("addresses");
    const savedAddress = user?.addresses?.id(selectedAddressId);

    if (!savedAddress) {
      throw new Error("Selected address was not found.");
    }

    savedAddress.lastUsedAt = new Date();
    await user.save();

    return normalizeSelectedAddress(savedAddress.toObject());
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
  products,
  fulfillmentType,
  selectedAddressId,
  selectedAddress
) => {
  if (!Array.isArray(products) || products.length === 0) {
    throw new Error("Order must include products.");
  }

  if (!["pickup", "delivery"].includes(fulfillmentType)) {
    throw new Error("Fulfillment type must be either pickup or delivery.");
  }

  const mergedProducts = mergeRequestedProducts(products);
  const productIds = mergedProducts.map((item) => item.productId);
  const foundProducts = await Product.find({ _id: { $in: productIds } });
  const foundProductMap = new Map(
    foundProducts.map((product) => [product._id.toString(), product])
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
  const populatedOrder = await Order.findById(order._id)
    .populate("userId", "name email phone role")
    .populate("products.productId", "name imageUrl category farmerId");

  const farmerIds = [
    ...new Set(
      populatedOrder.products
        .map((item) => item.productId?.farmerId)
        .filter(Boolean)
        .map((farmerId) => String(farmerId))
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

const reserveOrderStock = async (order) => {
  for (const item of order.products) {
    const product = await Product.findById(item.productId);

    if (!product || product.quantity < item.quantity) {
      throw new Error("Product stock changed before order confirmation.");
    }
  }

  for (const item of order.products) {
    await Product.findByIdAndUpdate(item.productId, {
      $inc: { quantity: -item.quantity },
    });
  }
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

  for (const item of order.products) {
    const product = await Product.findById(item.productId);

    if (!product || product.quantity < item.quantity) {
      order.paymentStatus = "failed";
      await order.save();

      throw new Error("Product stock changed before payment confirmation.");
    }
  }

  for (const item of order.products) {
    await Product.findByIdAndUpdate(item.productId, {
      $inc: { quantity: -item.quantity },
    });
  }

  order.paymentStatus = "paid";
  order.status = "pending";
  order.paymentReference = paymentReference;
  order.paymentProvider = paymentProvider;
  order.paymentMode = paymentMode;

  if (paymentProvider === "razorpay") {
    order.razorpayPaymentId = paymentReference;
  }

  await order.save();

  return {
    alreadyPaid: false,
    order: await emitPaidOrderAlert(order, order.userId, successMessage),
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

    const order = await Order.create({
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

    const order = await Order.findOne({
      razorpayOrderId,
      userId: req.user._id,
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

    const order = await Order.create({
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

    const order = await Order.create({
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

    const populatedOrder = await Order.findById(order._id)
      .populate("userId", "name email phone role")
      .populate("products.productId", "name imageUrl category farmerId");

    const farmerIds = [
      ...new Set(
        populatedOrder.products
          .map((item) => item.productId?.farmerId)
          .filter(Boolean)
          .map((farmerId) => String(farmerId))
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
