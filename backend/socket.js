const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const User = require("./models/User");

const getRoomId = (firstUserId, secondUserId) =>
  [String(firstUserId), String(secondUserId)].sort().join("__");

const initializeSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
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

    socket.on("send_message", ({ recipientId, text }) => {
      if (!recipientId || !text?.trim()) {
        return;
      }

      const roomId = getRoomId(socket.user._id, recipientId);
      const message = {
        id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
        senderId: String(socket.user._id),
        senderName: socket.user.name,
        recipientId: String(recipientId),
        text: text.trim(),
        timestamp: new Date().toISOString(),
      };

      io.to(roomId).emit("receive_message", message);
    });
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
