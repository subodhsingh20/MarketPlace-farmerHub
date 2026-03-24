const { getIo } = require("../socketInstance");
const {
  createChatMessage,
  deleteConversation,
  findChatRecipient,
  formatChatMessage,
  getConversationHistory,
  getRoomId,
  markConversationAsRead,
} = require("../services/chatService");

const emitChatEvents = ({ sender, recipient, chatMessage }) => {
  const io = getIo();

  if (!io) {
    return;
  }

  const roomId = getRoomId(sender._id, recipient._id);

  io.to(roomId).emit("chatMessage", chatMessage);
  io.to(roomId).emit("receive_message", chatMessage);
  const notificationPayload = {
    type: "chat_message",
    senderId: String(sender._id),
    receiverId: String(recipient._id),
    message: `New message from ${sender.name}.`,
    chatMessage,
    timestamp: chatMessage.timestamp,
  };

  io.to(String(recipient._id)).emit("chatMessage", notificationPayload);
  io.to(String(recipient._id)).emit("chat_message", notificationPayload);
};

const emitMessagesRead = ({ currentUserId, otherUserId, orderId }) => {
  const io = getIo();

  if (!io) {
    return;
  }

  const roomId = getRoomId(currentUserId, otherUserId);
  const payload = {
    userId: String(currentUserId),
    otherUserId: String(otherUserId),
    orderId: orderId || null,
    timestamp: new Date().toISOString(),
  };

  io.to(roomId).emit("messagesRead", payload);
  io.to(String(otherUserId)).emit("messagesRead", payload);
};

const emitTypingEvent = ({ senderId, receiverId, senderName, isTyping }) => {
  const io = getIo();

  if (!io) {
    return;
  }

  const roomId = getRoomId(senderId, receiverId);
  const payload = {
    senderId: String(senderId),
    receiverId: String(receiverId),
    senderName,
    isTyping: Boolean(isTyping),
  };

  io.to(roomId).emit("typing", payload);
  io.to(String(receiverId)).emit("typing", payload);
};

const sendChatMessage = async (req, res) => {
  try {
    const receiverId = req.body.receiverId || req.body.recipientId;
    const text = req.body.message || req.body.text;
    const { orderId, imageUrl } = req.body;

    if (!receiverId || (!String(text || "").trim() && !String(imageUrl || "").trim())) {
      return res.status(400).json({
        message: "receiverId and a message or image are required.",
      });
    }

    const recipient = await findChatRecipient(receiverId);

    if (!recipient) {
      return res.status(404).json({ message: "Chat recipient not found." });
    }

    const savedMessage = await createChatMessage({
      sender: req.user,
      recipient,
      text,
      orderId,
      imageUrl,
    });

    const chatMessage = formatChatMessage(savedMessage);

    emitChatEvents({
      sender: req.user,
      recipient,
      chatMessage,
    });

    return res.status(201).json({
      message: "Chat message sent successfully.",
      chatMessage,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to send chat message.",
      error: error.message,
    });
  }
};

const getChatHistory = async (req, res) => {
  try {
    const senderId = req.query.senderId || req.user._id;
    const receiverId = req.query.receiverId || req.query.user || req.query.otherUserId;

    if (!senderId || !receiverId) {
      return res.status(400).json({
        message: "senderId and receiverId are required.",
      });
    }

    const normalizedSenderId = String(senderId);
    const normalizedReceiverId = String(receiverId);
    const currentUserId = String(req.user._id);

    if (![normalizedSenderId, normalizedReceiverId].includes(currentUserId)) {
      return res.status(403).json({
        message: "Forbidden. You can only access your own conversations.",
      });
    }

    const messages = await getConversationHistory({
      currentUserId: normalizedSenderId,
      otherUserId: normalizedReceiverId,
      orderId: req.query.orderId,
    });

    if (currentUserId === normalizedSenderId) {
      const updatedCount = await markConversationAsRead({
        currentUserId: normalizedSenderId,
        otherUserId: normalizedReceiverId,
        orderId: req.query.orderId,
      });

      if (updatedCount > 0) {
        emitMessagesRead({
          currentUserId: normalizedSenderId,
          otherUserId: normalizedReceiverId,
          orderId: req.query.orderId,
        });
      }
    }

    return res.status(200).json({
      messages: messages.map(formatChatMessage),
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch chat history.",
      error: error.message,
    });
  }
};

const getChatConversations = async (req, res) => {
  try {
    const ChatMessage = require("../models/ChatMessage");
    const conversations = await ChatMessage.find({
      $or: [{ senderId: req.user._id }, { receiverId: req.user._id }],
    })
      .populate("senderId", "name role")
      .populate("receiverId", "name role")
      .sort({ timestamp: -1, createdAt: -1 });

    const latestByUser = new Map();

    conversations.forEach((entry) => {
      const otherUser =
        String(entry.senderId?._id || entry.senderId) === String(req.user._id)
          ? entry.receiverId
          : entry.senderId;

      if (!otherUser?._id) {
        return;
      }

      const key = String(otherUser._id);
      const isUnread =
        String(entry.receiverId?._id || entry.receiverId) === String(req.user._id) &&
        !entry.readStatus;

      if (!latestByUser.has(key)) {
        latestByUser.set(key, {
          userId: key,
          name: otherUser.name || "User",
          role: otherUser.role || "",
          lastMessage: entry.message,
          lastMessageType: entry.imageUrl && !entry.message ? "image" : "text",
          imageUrl: entry.imageUrl || null,
          timestamp: (entry.timestamp || entry.createdAt).toISOString(),
          unreadCount: isUnread ? 1 : 0,
          readStatus: Boolean(entry.readStatus),
        });
        return;
      }

      if (isUnread) {
        const existingConversation = latestByUser.get(key);
        latestByUser.set(key, {
          ...existingConversation,
          unreadCount: (existingConversation.unreadCount || 0) + 1,
        });
      }
    });

    return res.status(200).json({
      conversations: Array.from(latestByUser.values()),
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch chat conversations.",
      error: error.message,
    });
  }
};

const markChatAsRead = async (req, res) => {
  try {
    const otherUserId = req.body.otherUserId || req.body.senderId;

    if (!otherUserId) {
      return res.status(400).json({
        message: "otherUserId is required.",
      });
    }

    const updatedCount = await markConversationAsRead({
      currentUserId: String(req.user._id),
      otherUserId: String(otherUserId),
      orderId: req.body.orderId,
    });

    if (updatedCount > 0) {
      emitMessagesRead({
        currentUserId: String(req.user._id),
        otherUserId: String(otherUserId),
        orderId: req.body.orderId,
      });
    }

    return res.status(200).json({
      message: "Messages marked as read.",
      updatedCount,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to update read status.",
      error: error.message,
    });
  }
};

const deleteChatConversation = async (req, res) => {
  try {
    const otherUserId = req.params.otherUserId || req.body.otherUserId;

    if (!otherUserId) {
      return res.status(400).json({
        message: "otherUserId is required.",
      });
    }

    const recipient = await findChatRecipient(otherUserId);

    if (!recipient) {
      return res.status(404).json({ message: "Chat recipient not found." });
    }

    const result = await deleteConversation({
      currentUserId: String(req.user._id),
      otherUserId: String(otherUserId),
    });

    const io = getIo();

    if (io) {
      const payload = {
        userId: String(req.user._id),
        otherUserId: String(otherUserId),
        deletedCount: result.deletedCount || 0,
      };

      io.to(getRoomId(req.user._id, otherUserId)).emit("chatDeleted", payload);
      io.to(String(otherUserId)).emit("chatDeleted", payload);
    }

    return res.status(200).json({
      message: "Conversation deleted successfully.",
      deletedCount: result.deletedCount || 0,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to delete conversation.",
      error: error.message,
    });
  }
};

module.exports = {
  deleteChatConversation,
  emitChatEvents,
  getChatConversations,
  getChatHistory,
  markChatAsRead,
  emitTypingEvent,
  sendChatMessage,
};
