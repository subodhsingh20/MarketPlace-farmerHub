const { orders, products, users } = require("../data");
const { hydrateOrder, toCustomerSummary, toFarmerSummary, toProductSummary } = require("../data/hydrators");

const mergeRequestedProducts = (items) => {
  const mergedProducts = new Map();

  for (const item of items) {
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

const getProductsByIds = async (productIds) => {
  const uniqueIds = [...new Set(productIds.map((id) => String(id)))];
  if (!uniqueIds.length) {
    return [];
  }

  return products.find({ _id: { $in: uniqueIds } });
};

const getProductMapByIds = async (productIds) => {
  const docs = await getProductsByIds(productIds);
  return new Map(docs.map((doc) => [String(doc._id), doc]));
};

const populateOrder = async (order) => {
  if (!order) {
    return null;
  }

  const user = await users.findById(order.userId);
  const productIds = (order.products || []).map((item) => item.productId);
  const productDocs = await getProductsByIds(productIds);
  const productMap = new Map(productDocs.map((doc) => [String(doc._id), doc]));
  const farmerIds = [...new Set(productDocs.map((doc) => String(doc.farmerId)))];
  const farmerDocs = await Promise.all(farmerIds.map((id) => users.findById(id)));
  const farmerMap = new Map(
    farmerDocs.filter(Boolean).map((doc) => [String(doc._id), toFarmerSummary(doc)])
  );

  return hydrateOrder(order, {
    user: user ? toCustomerSummary(user) : null,
    productsById: new Map(
      productDocs.map((doc) => [
        String(doc._id),
        {
          ...doc,
          farmerId: farmerMap.get(String(doc.farmerId)) || doc.farmerId,
        },
      ])
    ),
  });
};

const reserveOrderStock = async (order) => {
  for (const item of order.products) {
    const product = await products.findById(item.productId);

    if (!product || product.quantity < item.quantity) {
      throw new Error("Product stock changed before order confirmation.");
    }
  }

  for (const item of order.products) {
    await products.updateById(item.productId, (doc) => ({
      ...doc,
      quantity: Number(doc.quantity) - Number(item.quantity),
    }));
  }
};

const restockOrderItems = async (order) => {
  for (const item of order.products) {
    await products.updateById(item.productId, (doc) => ({
      ...doc,
      quantity: Number(doc.quantity) + Number(item.quantity),
    }));
  }
};

const getOrdersForFarmer = async (farmerId, { paymentStatus } = {}) => {
  const farmerProducts = await products.find({ farmerId: String(farmerId) });
  const farmerProductIds = new Set(farmerProducts.map((product) => String(product._id)));
  const allOrders = await orders.find({}, { sort: [{ createdAt: -1 }] });

  return allOrders.filter((order) => {
    if (paymentStatus && order.paymentStatus !== paymentStatus) {
      return false;
    }

    return Array.isArray(order.products)
      ? order.products.some((item) => farmerProductIds.has(String(item.productId)))
      : false;
  });
};

const getFarmerOrderProducts = async (order, farmerId) => {
  const productIds = (order.products || []).map((item) => item.productId);
  const productDocs = await getProductsByIds(productIds);
  return productDocs.filter((product) => String(product.farmerId) === String(farmerId));
};

module.exports = {
  getFarmerOrderProducts,
  getOrdersForFarmer,
  getProductMapByIds,
  mergeRequestedProducts,
  populateOrder,
  reserveOrderStock,
  restockOrderItems,
};
