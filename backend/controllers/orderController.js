const Order = require("../models/Order");
const Product = require("../models/Product");
const { emitOrderAlert } = require("../socket");
const { getIo } = require("../socketInstance");

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

const placeOrder = async (req, res) => {
  try {
    const { products, fulfillmentType } = req.body;

    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ message: "Order must include products." });
    }

    if (!["pickup", "delivery"].includes(fulfillmentType)) {
      return res.status(400).json({
        message: "Fulfillment type must be either pickup or delivery.",
      });
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
        return res.status(404).json({
          message: `Product not found for id ${item.productId}.`,
        });
      }

      if (!Number.isInteger(quantity) || quantity <= 0) {
        return res.status(400).json({
          message: `Invalid quantity for product ${product.name}.`,
        });
      }

      if (product.quantity < quantity) {
        return res.status(400).json({
          message: `Insufficient quantity available for ${product.name}.`,
        });
      }

      normalizedProducts.push({
        productId: product._id,
        quantity,
        price: product.price,
      });

      totalPrice += product.price * quantity;
    }

    const order = await Order.create({
      userId: req.user._id,
      products: normalizedProducts,
      totalPrice,
      fulfillmentType,
      paymentStatus: "paid",
    });

    for (const item of normalizedProducts) {
      await Product.findByIdAndUpdate(item.productId, {
        $inc: { quantity: -item.quantity },
      });
    }

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
      type: "order_created",
      orderId: populatedOrder._id,
      customerId: req.user._id,
      farmerIds,
      message: "A new order has been placed.",
      status: populatedOrder.status,
    });

    return res.status(201).json({
      message: "Order placed successfully.",
      order: populatedOrder,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to place order.",
      error: error.message,
    });
  }
};

const getUserOrders = async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.user._id })
      .populate("products.productId", "name imageUrl category farmerId")
      .sort({ createdAt: -1 });

    return res.status(200).json({ orders });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch user orders.",
      error: error.message,
    });
  }
};

const getFarmerOrders = async (req, res) => {
  try {
    const farmerProducts = await Product.find({ farmerId: req.user._id }).select("_id");
    const farmerProductIds = farmerProducts.map((product) => product._id);

    const orders = await Order.find({
      "products.productId": { $in: farmerProductIds },
    })
      .populate("userId", "name email phone location")
      .populate({
        path: "products.productId",
        select: "name imageUrl category farmerId price",
      })
      .sort({ createdAt: -1 });

    const filteredOrders = orders
      .map((order) => {
        const matchingProducts = order.products.filter(
          (item) =>
            item.productId &&
            String(item.productId.farmerId) === String(req.user._id)
        );

        return {
          ...order.toObject(),
          products: matchingProducts,
        };
      })
      .filter((order) => order.products.length > 0);

    return res.status(200).json({ orders: filteredOrders });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch farmer orders.",
      error: error.message,
    });
  }
};

const getFarmerAnalytics = async (req, res) => {
  try {
    const farmerProducts = await Product.find({ farmerId: req.user._id }).select("_id price");
    const farmerProductIds = farmerProducts.map((product) => String(product._id));

    const orders = await Order.find({
      "products.productId": { $in: farmerProductIds },
      paymentStatus: "paid",
    })
      .populate({
        path: "products.productId",
        select: "farmerId",
      })
      .sort({ createdAt: -1 });

    let totalEarnings = 0;
    let completedEarnings = 0;
    let totalItemsSold = 0;
    let pendingOrders = 0;
    let completedOrders = 0;
    let cancelledOrders = 0;

    const recentEarnings = orders
      .slice(0, 5)
      .map((order) => {
        const orderRevenue = order.products.reduce((sum, item) => {
          if (
            item.productId &&
            String(item.productId.farmerId) === String(req.user._id)
          ) {
            return sum + item.price * item.quantity;
          }

          return sum;
        }, 0);

        return {
          orderId: order._id,
          amount: orderRevenue,
          status: order.status,
          createdAt: order.createdAt,
        };
      })
      .filter((item) => item.amount > 0);

    orders.forEach((order) => {
      let orderHasFarmerProducts = false;
      let orderRevenue = 0;

      order.products.forEach((item) => {
        if (
          item.productId &&
          String(item.productId.farmerId) === String(req.user._id)
        ) {
          orderHasFarmerProducts = true;
          const lineRevenue = item.price * item.quantity;
          orderRevenue += lineRevenue;
          totalItemsSold += item.quantity;
        }
      });

      if (!orderHasFarmerProducts) {
        return;
      }

      totalEarnings += orderRevenue;

      if (order.status === "completed") {
        completedOrders += 1;
        completedEarnings += orderRevenue;
      } else if (order.status === "cancelled") {
        cancelledOrders += 1;
      } else {
        pendingOrders += 1;
      }
    });

    return res.status(200).json({
      analytics: {
        totalEarnings,
        completedEarnings,
        totalItemsSold,
        pendingOrders,
        completedOrders,
        cancelledOrders,
        totalOrders: pendingOrders + completedOrders + cancelledOrders,
        recentEarnings,
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch farmer analytics.",
      error: error.message,
    });
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    if (!["confirmed", "completed", "cancelled"].includes(status)) {
      return res.status(400).json({
        message: "Status must be confirmed, completed, or cancelled.",
      });
    }

    const order = await Order.findById(orderId).populate({
      path: "products.productId",
      select: "name imageUrl category farmerId",
    });

    if (!order) {
      return res.status(404).json({ message: "Order not found." });
    }

    const farmerOwnsProduct = order.products.some(
      (item) =>
        item.productId && String(item.productId.farmerId) === String(req.user._id)
    );

    if (!farmerOwnsProduct) {
      return res.status(403).json({
        message: "Forbidden. You can only update orders for your own products.",
      });
    }

    order.status = status;
    await order.save();

    const populatedOrder = await Order.findById(order._id)
      .populate("userId", "name email phone role")
      .populate({
        path: "products.productId",
        select: "name imageUrl category farmerId",
      });

    const farmerIds = [
      ...new Set(
        populatedOrder.products
          .map((item) => item.productId?.farmerId)
          .filter(Boolean)
          .map((farmerId) => String(farmerId))
      ),
    ];

    emitOrderAlert(getIo(), {
      type: "order_updated",
      orderId: populatedOrder._id,
      customerId: populatedOrder.userId?._id,
      farmerIds,
      message: `Order status updated to ${status}.`,
      status,
    });

    return res.status(200).json({
      message: "Order status updated successfully.",
      order: populatedOrder,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to update order status.",
      error: error.message,
    });
  }
};

module.exports = {
  placeOrder,
  getUserOrders,
  getFarmerOrders,
  getFarmerAnalytics,
  updateOrderStatus,
};
