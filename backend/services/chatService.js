const { chatMessages, orders, products, users } = require("../data");
const {
  hydrateChatMessage,
  toDateIso,
  toId,
  toPublicUser,
} = require("../data/hydrators");

const getRoomId = (firstUserId, secondUserId) =>
  [String(firstUserId), String(secondUserId)].sort().join("__");

const formatChatMessage = (message) => ({
  id: String(message._id),
  senderId: String(message.senderId?._id || message.senderId),
  senderName: message.senderId?.name || message.senderName || "User",
  senderRole: message.senderId?.role || message.senderRole || "",
  receiverId: String(message.receiverId?._id || message.receiverId),
  receiverName: message.receiverId?.name || message.receiverName || "User",
  receiverRole: message.receiverId?.role || message.receiverRole || "",
  recipientId: String(message.receiverId?._id || message.receiverId),
  recipientName: message.receiverId?.name || message.receiverName || "User",
  recipientRole: message.receiverId?.role || message.receiverRole || "",
  orderId: message.orderId ? String(message.orderId?._id || message.orderId) : null,
  message: message.message || message.text,
  text: message.message || message.text,
  imageUrl: message.imageUrl || null,
  timestamp: toDateIso(message.timestamp || message.createdAt || new Date()),
  readStatus: Boolean(message.readStatus),
  readAt: toDateIso(message.readAt),
});

const getParticipantContext = (sender, recipient) => {
  if (!sender || !recipient || sender.role === recipient.role) {
    return null;
  }

  if (sender.role === "customer") {
    return {
      customerId: sender._id,
      farmerId: recipient._id,
    };
  }

  if (sender.role === "farmer") {
    return {
      customerId: recipient._id,
      farmerId: sender._id,
    };
  }

  return null;
};

const getFarmerProductIds = async (farmerId) => {
  const farmerProducts = await products.find({ farmerId: String(farmerId) });
  return farmerProducts.map((product) => product._id);
};

const findRelatedOrderId = async ({ sender, recipient, requestedOrderId }) => {
  const participantContext = getParticipantContext(sender, recipient);

  if (!participantContext) {
    return null;
  }

  const { customerId, farmerId } = participantContext;
  const farmerProductIds = await getFarmerProductIds(farmerId);

  if (!farmerProductIds.length) {
    return null;
  }

  const customerOrders = await orders.find({ userId: String(customerId) }, { sort: [{ createdAt: -1 }] });

  const matchesFarmerOrder = (order) =>
    Array.isArray(order.products) &&
    order.products.some((item) => farmerProductIds.includes(toId(item.productId)));

  if (requestedOrderId) {
    const matchingOrder = customerOrders.find(
      (order) => String(order._id) === String(requestedOrderId) && matchesFarmerOrder(order)
    );

    if (matchingOrder) {
      return matchingOrder._id;
    }
  }

  const latestOrder = customerOrders.find(matchesFarmerOrder);

  return latestOrder?._id || null;
};

const createChatMessage = async ({ sender, recipient, text, orderId, imageUrl }) => {
  const normalizedText = String(text || "").trim();
  const normalizedImageUrl = String(imageUrl || "").trim() || null;

  if (!normalizedText && !normalizedImageUrl) {
    throw new Error("Message text or image is required.");
  }

  const resolvedOrderId = await findRelatedOrderId({
    sender,
    recipient,
    requestedOrderId: orderId,
  });

  const message = await chatMessages.create({
    senderId: sender._id,
    receiverId: recipient._id,
    orderId: resolvedOrderId,
    message: normalizedText,
    imageUrl: normalizedImageUrl,
    timestamp: new Date().toISOString(),
    readStatus: false,
    readAt: null,
  });

  const order = resolvedOrderId ? await orders.findById(resolvedOrderId) : null;

  return hydrateChatMessage(message, {
    sender: toPublicUser(sender),
    receiver: toPublicUser(recipient),
    order,
  });
};

const getConversationHistory = async ({ currentUserId, otherUserId, orderId }) => {
  const messages = await chatMessages.find(
    {
      $or: [
        { senderId: String(currentUserId), receiverId: String(otherUserId) },
        { senderId: String(otherUserId), receiverId: String(currentUserId) },
      ],
      ...(orderId ? { orderId: String(orderId) } : {}),
    },
    { sort: [{ timestamp: 1 }, { createdAt: 1 }] }
  );

  const participantIds = new Set();
  const orderIds = new Set();

  messages.forEach((message) => {
    participantIds.add(String(message.senderId));
    participantIds.add(String(message.receiverId));

    if (message.orderId) {
      orderIds.add(String(message.orderId));
    }
  });

  const userDocs = await Promise.all(Array.from(participantIds).map((id) => users.findById(id)));
  const userMap = new Map(userDocs.filter(Boolean).map((doc) => [String(doc._id), toPublicUser(doc)]));

  const orderDocs = await Promise.all(Array.from(orderIds).map((id) => orders.findById(id)));
  const orderMap = new Map(orderDocs.filter(Boolean).map((doc) => [String(doc._id), doc]));

  return messages.map((message) =>
    hydrateChatMessage(message, {
      sender: userMap.get(String(message.senderId)),
      receiver: userMap.get(String(message.receiverId)),
      order: message.orderId ? orderMap.get(String(message.orderId)) : null,
    })
  );
};

const markConversationAsRead = async ({ currentUserId, otherUserId, orderId }) => {
  const updated = await chatMessages.updateMany(
    {
      senderId: String(otherUserId),
      receiverId: String(currentUserId),
      readStatus: false,
      ...(orderId ? { orderId: String(orderId) } : {}),
    },
    (doc) => ({
      ...doc,
      readStatus: true,
      readAt: new Date().toISOString(),
    })
  );

  return updated.modifiedCount || 0;
};

const deleteConversation = async ({ currentUserId, otherUserId }) =>
  chatMessages.deleteMany({
    $or: [
      { senderId: String(currentUserId), receiverId: String(otherUserId) },
      { senderId: String(otherUserId), receiverId: String(currentUserId) },
    ],
  });

const findChatRecipient = async (recipientId) => {
  const user = await users.findById(recipientId);

  if (!user) {
    return null;
  }

  return toPublicUser(user);
};

module.exports = {
  createChatMessage,
  deleteConversation,
  findChatRecipient,
  formatChatMessage,
  getConversationHistory,
  getRoomId,
  markConversationAsRead,
};
