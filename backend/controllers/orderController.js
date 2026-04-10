const { orders, products } = require("../data");
const { emitOrderAlert } = require("../socket");
const { getIo } = require("../socketInstance");
const {
  getOrdersForFarmer,
  mergeRequestedProducts,
  populateOrder,
} = require("../services/orderService");

const placeOrder = async (req, res) => {
  try {
    const { products: requestedProducts, fulfillmentType, shippingAddress } = req.body;

    if (!Array.isArray(requestedProducts) || requestedProducts.length === 0) {
      return res.status(400).json({ message: "Order must include products." });
    }

    if (!["pickup", "delivery"].includes(fulfillmentType)) {
      return res.status(400).json({
        message: "Fulfillment type must be either pickup or delivery.",
      });
    }

    if (!shippingAddress) {
      return res.status(400).json({
        message: "A shipping address is required.",
      });
    }

    const mergedProducts = mergeRequestedProducts(requestedProducts);
    const productIds = mergedProducts.map((item) => item.productId);
    const foundProducts = await products.find({ _id: { $in: productIds } });
    const foundProductMap = new Map(
      foundProducts.map((product) => [String(product._id), product])
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

      if (!Number.isFinite(quantity) || quantity <= 0) {
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
        unit: product.unit,
      });

      totalPrice += product.price * quantity;
    }

    const order = await orders.create({
      userId: req.user._id,
      products: normalizedProducts,
      totalPrice,
      fulfillmentType,
      shippingAddress,
      paymentStatus: "paid",
    });

    for (const item of normalizedProducts) {
      await products.updateById(item.productId, (doc) => ({
        ...doc,
        quantity: Number(doc.quantity) - Number(item.quantity),
      }));
    }

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
    const userOrders = await orders.find(
      { userId: String(req.user._id) },
      { sort: [{ createdAt: -1 }] }
    );
    const populatedOrders = await Promise.all(userOrders.map((order) => populateOrder(order)));

    return res.status(200).json({ orders: populatedOrders });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch user orders.",
      error: error.message,
    });
  }
};

const getFarmerOrders = async (req, res) => {
  try {
    const farmerOrders = await getOrdersForFarmer(req.user._id);
    const populatedOrders = (
      await Promise.allSettled(farmerOrders.map((order) => populateOrder(order)))
    )
      .filter((result) => result.status === "fulfilled" && result.value)
      .map((result) => result.value);

    const filteredOrders = populatedOrders
      .map((order) => {
        const matchingProducts = order.products.filter(
          (item) =>
            item.productId &&
            String(item.productId.farmerId?._id || item.productId.farmerId) === String(req.user._id)
        );

        return {
          ...order,
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
    const farmerProducts = await products.find({ farmerId: String(req.user._id) });
    const farmerProductIds = new Set(farmerProducts.map((product) => String(product._id)));
    const farmerOrders = await orders.find({}, { sort: [{ createdAt: -1 }] });

    let totalEarnings = 0;
    let completedEarnings = 0;
    let totalItemsSold = 0;
    let pendingOrders = 0;
    let completedOrders = 0;
    let cancelledOrders = 0;
    const recentEarnings = [];

    farmerOrders.forEach((order) => {
      if (order.paymentStatus !== "paid") {
        return;
      }

      let orderHasFarmerProducts = false;
      let orderRevenue = 0;
      const orderProducts = Array.isArray(order.products) ? order.products : [];

      orderProducts.forEach((item) => {
        const productId = String(item.productId?._id || item.productId || "");

        if (productId && farmerProductIds.has(productId)) {
          orderHasFarmerProducts = true;
          const quantity = Number(item.quantity) || 0;
          const price = Number(item.price) || 0;
          const lineRevenue = price * quantity;
          orderRevenue += lineRevenue;
          totalItemsSold += quantity;
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

      if (orderRevenue > 0 && recentEarnings.length < 5) {
        recentEarnings.push({
          orderId: order._id,
          amount: orderRevenue,
          status: order.status,
          createdAt: order.createdAt,
        });
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

    const order = await orders.findById(orderId);

    if (!order) {
      return res.status(404).json({ message: "Order not found." });
    }

    const productDocs = await Promise.all(
      order.products.map((item) => products.findById(item.productId))
    );

    const ownsAny = productDocs.some(
      (product) => product && String(product.farmerId) === String(req.user._id)
    );

    if (!ownsAny) {
      return res.status(403).json({
        message: "Forbidden. You can only update orders for your own products.",
      });
    }

    const updatedOrder = await orders.updateById(order._id, (doc) => ({
      ...doc,
      status,
    }));

    const populatedOrder = await populateOrder(updatedOrder);
    const farmerIds = [
      ...new Set(
        populatedOrder.products
          .map((item) => item.productId?.farmerId)
          .filter(Boolean)
          .map((farmerId) => String(farmerId._id || farmerId))
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
