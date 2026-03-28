const express = require("express");
const http = require("http");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const dotenv = require("dotenv");
const authRoutes = require("./routes/authRoutes");
const orderRoutes = require("./routes/orderRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const productRoutes = require("./routes/productRoutes");
const ratingRoutes = require("./routes/ratingRoutes");
const chatRoutes = require("./routes/chatRoutes");
const farmerRoutes = require("./routes/farmerRoutes");
const customerRoutes = require("./routes/customerRoutes");
const { initializeSocket } = require("./socket");
const { setIo } = require("./socketInstance");
const { protect } = require("./middleware/authMiddleware");
const { requestLogger } = require("./middleware/requestLogger");

dotenv.config({ path: path.resolve(__dirname, "../.env") });
dotenv.config({ path: path.resolve(__dirname, ".env"), override: true });

const app = express();
const server = http.createServer(app);
setIo(initializeSocket(server));
const PORT = process.env.PORT || 5000;
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/farmer-marketplace";

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(requestLogger);

app.get("/", (_req, res) => {
  res.json({ message: "Farmer Marketplace API is running" });
});

app.use("/api/auth", authRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/products", productRoutes);
app.use("/api/ratings", ratingRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/farmers", farmerRoutes);
app.use("/api/customer", customerRoutes);

app.get("/api/protected", protect, (req, res) => {
  res.json({
    message: "Protected route accessed successfully.",
    user: req.user,
  });
});

const startServer = async () => {
  try {
    if (!process.env.JWT_SECRET) {
      console.warn("JWT_SECRET is not set. Falling back to the development secret.");
    }

    if (!process.env.CLIENT_URL) {
      console.warn("CLIENT_URL is not set. Socket CORS will default to http://localhost:3000.");
    }

    if (!process.env.MONGODB_URI) {
      console.warn("MONGODB_URI is not set. Falling back to the local MongoDB connection string.");
    }

    await mongoose.connect(MONGODB_URI);
    console.log("MongoDB connected");

    server.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  }
};

startServer();
