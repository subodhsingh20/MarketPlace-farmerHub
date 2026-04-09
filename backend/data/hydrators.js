const toId = (value) => String(value?._id || value || "");

const toDateIso = (value) => {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);

  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const clone = (value) => JSON.parse(JSON.stringify(value));

const toPublicUser = (user, { includePassword = false } = {}) => {
  if (!user) {
    return null;
  }

  const cloned = clone(user);

  if (!includePassword) {
    delete cloned.password;
  }

  return {
    ...cloned,
    id: toId(cloned),
    _id: toId(cloned),
  };
};

const toFarmerSummary = (farmer) => {
  if (!farmer) {
    return null;
  }

  return {
    _id: toId(farmer),
    name: farmer.name || "Farmer",
    email: farmer.email || "",
    phone: farmer.phone || "",
    location: farmer.location || null,
    averageRating: farmer.averageRating || 0,
    role: farmer.role || "farmer",
  };
};

const toCustomerSummary = (customer) => {
  if (!customer) {
    return null;
  }

  return {
    _id: toId(customer),
    name: customer.name || "User",
    email: customer.email || "",
    phone: customer.phone || "",
    location: customer.location || null,
    role: customer.role || "customer",
  };
};

const toProductSummary = (product, farmer) => {
  if (!product) {
    return null;
  }

  return {
    ...clone(product),
    _id: toId(product),
    farmerId: farmer ? toFarmerSummary(farmer) : product.farmerId,
  };
};

const hydrateProduct = (product, farmer) => {
  if (!product) {
    return null;
  }

  return {
    ...clone(product),
    _id: toId(product),
    farmerId: toFarmerSummary(farmer),
  };
};

const hydrateOrder = (order, { user, productsById = new Map() } = {}) => {
  if (!order) {
    return null;
  }

  const cloned = clone(order);

  return {
    ...cloned,
    _id: toId(cloned),
    userId: user ? toCustomerSummary(user) : cloned.userId,
    products: (cloned.products || []).map((item) => {
      const product = productsById.get(toId(item.productId));
      return {
        ...item,
        productId: product ? toProductSummary(product, product.farmerId) : item.productId,
      };
    }),
  };
};

const hydrateChatMessage = (message, { sender, receiver, order } = {}) => {
  if (!message) {
    return null;
  }

  const cloned = clone(message);

  return {
    ...cloned,
    _id: toId(cloned),
    senderId: sender ? toCustomerSummary(sender) : cloned.senderId,
    receiverId: receiver ? toCustomerSummary(receiver) : cloned.receiverId,
    recipientId: receiver ? toCustomerSummary(receiver) : cloned.receiverId,
    orderId: order ? { _id: toId(order) } : cloned.orderId,
    timestamp: toDateIso(cloned.timestamp || cloned.createdAt || new Date()),
    readAt: toDateIso(cloned.readAt),
  };
};

module.exports = {
  clone,
  hydrateChatMessage,
  hydrateOrder,
  hydrateProduct,
  toCustomerSummary,
  toDateIso,
  toFarmerSummary,
  toId,
  toProductSummary,
  toPublicUser,
};
