const mongoose = require("mongoose");

const orderProductSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    products: {
      type: [orderProductSchema],
      required: true,
      validate: {
        validator: (value) => Array.isArray(value) && value.length > 0,
        message: "At least one product is required in an order.",
      },
    },
    totalPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "completed", "cancelled"],
      default: "pending",
      required: true,
    },
    fulfillmentType: {
      type: String,
      enum: ["pickup", "delivery"],
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ["created", "paid", "failed"],
      default: "created",
      required: true,
    },
    paymentProvider: {
      type: String,
      trim: true,
      default: "mock",
    },
    paymentMode: {
      type: String,
      enum: ["test", "live"],
      default: "test",
      required: true,
    },
    paymentReference: {
      type: String,
      trim: true,
    },
    razorpayOrderId: {
      type: String,
      trim: true,
    },
    razorpayPaymentId: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Order", orderSchema);
