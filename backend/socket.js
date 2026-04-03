const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const User = require("./models/User");
const {
  emitChatEvents,
  emitTypingEvent,
} = require("./controllers/chatController");
const {
  createChatMessage,
  findChatRecipient,
  formatChatMessage,
  getRoomId,
  markConversationAsRead,
} = require("./services/chatService");
const { isAllowedOrigin } = require("./utils/corsOrigins");

const initializeSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin(origin, callback) {
        if (isAllowedOrigin(origin)) {
          return callback(null, true);
        }

        return callback(new Error("Socket CORS origin not allowed."));
      },
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;

      if (!token) {
        return next(new Error("Authentication token missing."));
      }

      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || "development_jwt_secret"
      );
      const user = await User.findById(decoded.id).select("name email role");

      if (!user) {
        return next(new Error("User not found."));
      }

      socket.user = user;
      return next();
    } catch (error) {
      return next(new Error("Socket authentication failed."));
    }
  });

  io.on("connection", (socket) => {
    socket.join(String(socket.user._id));

    socket.on("join_chat", ({ otherUserId }) => {
      if (!otherUserId) {
        return;
      }

      const roomId = getRoomId(socket.user._id, otherUserId);
      socket.join(roomId);
    });

    const handleChatMessage = async ({
      receiverId,
      recipientId,
      message,
      text,
      orderId,
      imageUrl,
    }) => {
      const targetReceiverId = receiverId || recipientId;
      const messageText = message || text;

      if (!targetReceiverId || (!messageText?.trim() && !String(imageUrl || "").trim())) {
        return;
      }

      try {
        const recipient = await findChatRecipient(targetReceiverId);

        if (!recipient) {
          return;
        }

        const savedMessage = await createChatMessage({
          sender: socket.user,
          recipient,
          text: messageText,
          orderId,
          imageUrl,
        });

        emitChatEvents({
          sender: socket.user,
          recipient,
          chatMessage: formatChatMessage(savedMessage),
        });
      } catch (_error) {
        // Keep the socket alive even if chat persistence fails.
      }
    };

    socket.on("typing", ({ receiverId, isTyping }) => {
      if (!receiverId) {
        return;
      }

      emitTypingEvent({
        senderId: socket.user._id,
        receiverId,
        senderName: socket.user.name,
        isTyping,
      });
    });

    socket.on("mark_read", async ({ otherUserId, orderId }) => {
      if (!otherUserId) {
        return;
      }

      try {
        const updatedCount = await markConversationAsRead({
          currentUserId: String(socket.user._id),
          otherUserId: String(otherUserId),
          orderId,
        });

        if (updatedCount > 0) {
          const roomId = getRoomId(socket.user._id, otherUserId);
          const payload = {
            userId: String(socket.user._id),
            otherUserId: String(otherUserId),
            orderId: orderId || null,
            timestamp: new Date().toISOString(),
          };

          io.to(roomId).emit("messagesRead", payload);
          io.to(String(otherUserId)).emit("messagesRead", payload);
        }
      } catch (_error) {
        // Keep the socket alive if read receipt persistence fails.
      }
    });

    socket.on("chatMessage", handleChatMessage);
    socket.on("send_message", handleChatMessage);
  });

  return io;
};

const emitOrderAlert = (io, payload) => {
  if (!io) {
    return;
  }

  const { customerId, farmerIds } = payload;

  if (customerId) {
    io.to(String(customerId)).emit("order_alert", payload);
  }

  (farmerIds || []).forEach((farmerId) => {
    io.to(String(farmerId)).emit("order_alert", payload);
  });
};

module.exports = { initializeSocket, emitOrderAlert };
