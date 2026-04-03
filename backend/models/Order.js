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
      min: 0.01,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    unit: {
      type: String,
      enum: ["kg", "litre"],
      default: "kg",
      required: true,
    },
  },
  { _id: false }
);

const orderAddressSchema = new mongoose.Schema(
  {
    addressId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    label: {
      type: String,
      required: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    street: {
      type: String,
      required: true,
      trim: true,
    },
    city: {
      type: String,
      required: true,
      trim: true,
    },
    state: {
      type: String,
      required: true,
      trim: true,
    },
    pincode: {
      type: String,
      required: true,
      trim: true,
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
    shippingAddress: {
      type: orderAddressSchema,
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
      enum: ["test", "live", "cod"],
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

orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ "products.productId": 1, createdAt: -1 });

module.exports = mongoose.model("Order", orderSchema);
