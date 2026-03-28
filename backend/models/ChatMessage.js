const mongoose = require("mongoose");

const chatMessageSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
      index: true,
    },
    message: {
      type: String,
      default: "",
      trim: true,
    },
    imageUrl: {
      type: String,
      default: null,
      trim: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      required: true,
      index: true,
    },
    readStatus: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

chatMessageSchema.index({ senderId: 1, receiverId: 1, timestamp: 1 });
chatMessageSchema.index({ receiverId: 1, readStatus: 1, timestamp: -1 });
chatMessageSchema.index({ senderId: 1, receiverId: 1, orderId: 1, timestamp: 1 });

chatMessageSchema.virtual("recipientId")
  .get(function getRecipientId() {
    return this.receiverId;
  })
  .set(function setRecipientId(value) {
    this.receiverId = value;
  });

chatMessageSchema.virtual("text")
  .get(function getText() {
    return this.message;
  })
  .set(function setText(value) {
    this.message = value;
  });

module.exports = mongoose.model("ChatMessage", chatMessageSchema);
