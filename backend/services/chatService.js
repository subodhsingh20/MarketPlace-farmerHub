const mongoose = require("mongoose");
const ChatMessage = require("../models/ChatMessage");
const Order = require("../models/Order");
const Product = require("../models/Product");
const User = require("../models/User");

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
  timestamp: (message.timestamp || message.createdAt || new Date()).toISOString(),
  readStatus: Boolean(message.readStatus),
  readAt: message.readAt ? new Date(message.readAt).toISOString() : null,
});

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(String(value || ""));

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
  const farmerProducts = await Product.find({ farmerId }).select("_id");
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

  const orderQuery = {
    userId: customerId,
    "products.productId": { $in: farmerProductIds },
  };

  if (requestedOrderId && isValidObjectId(requestedOrderId)) {
    const matchingOrder = await Order.findOne({
      ...orderQuery,
      _id: requestedOrderId,
    }).select("_id");

    return matchingOrder?._id || null;
  }

  const latestOrder = await Order.findOne(orderQuery)
    .sort({ createdAt: -1 })
    .select("_id");

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

  const message = await ChatMessage.create({
    senderId: sender._id,
    receiverId: recipient._id,
    orderId: resolvedOrderId,
    message: normalizedText,
    imageUrl: normalizedImageUrl,
    timestamp: new Date(),
    readStatus: false,
  });

  return ChatMessage.findById(message._id)
    .populate("senderId", "name role")
    .populate("receiverId", "name role")
    .populate("orderId", "_id");
};

const getConversationHistory = async ({ currentUserId, otherUserId, orderId }) => {
  const query = {
    $or: [
      { senderId: currentUserId, receiverId: otherUserId },
      { senderId: otherUserId, receiverId: currentUserId },
    ],
  };

  if (orderId && isValidObjectId(orderId)) {
    query.orderId = orderId;
  }

  return ChatMessage.find(query)
    .populate("senderId", "name role")
    .populate("receiverId", "name role")
    .populate("orderId", "_id")
    .sort({ timestamp: 1, createdAt: 1 });
};

const markConversationAsRead = async ({ currentUserId, otherUserId, orderId }) => {
  const query = {
    senderId: otherUserId,
    receiverId: currentUserId,
    readStatus: false,
  };

  if (orderId && isValidObjectId(orderId)) {
    query.orderId = orderId;
  }

  const result = await ChatMessage.updateMany(query, {
    $set: {
      readStatus: true,
      readAt: new Date(),
    },
  });

  return result.modifiedCount || 0;
};

const deleteConversation = async ({ currentUserId, otherUserId }) =>
  ChatMessage.deleteMany({
    $or: [
      { senderId: currentUserId, receiverId: otherUserId },
      { senderId: otherUserId, receiverId: currentUserId },
    ],
  });

const findChatRecipient = async (recipientId) => {
  if (!isValidObjectId(recipientId)) {
    return null;
  }

  return User.findById(recipientId).select("name role");
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
