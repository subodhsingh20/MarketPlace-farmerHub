const express = require("express");
const http = require("http");
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
const {
  CLIENT_ORIGIN_ENV_KEYS,
  getAllowedOrigins,
  isAllowedOrigin,
} = require("./utils/corsOrigins");
const { initializeCloudant } = require("./data");

dotenv.config({ path: path.resolve(__dirname, "../.env") });
dotenv.config({ path: path.resolve(__dirname, ".env"), override: true });

const app = express();
const server = http.createServer(app);
setIo(initializeSocket(server));
const PORT = process.env.PORT || 5000;

app.disable("x-powered-by");
app.set("trust proxy", 1);

app.use(
  cors({
    origin(origin, callback) {
      if (isAllowedOrigin(origin)) {
        return callback(null, true);
      }

      console.warn(`Blocked CORS origin: ${origin || "unknown"}`);
      return callback(new Error("CORS origin not allowed."));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(requestLogger);

app.get("/", (_req, res) => {
  res.json({ message: "Farmer Marketplace API is running" });
});

app.get("/api/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    service: "farmer-marketplace-backend",
    timestamp: new Date().toISOString(),
  });
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

app.use((error, _req, res, next) => {
  if (error?.message === "CORS origin not allowed.") {
    return res.status(403).json({
      message: "CORS origin not allowed.",
      allowedOrigins: getAllowedOrigins(),
    });
  }

  return next(error);
});

const startServer = async () => {
  try {
    if (!process.env.JWT_SECRET) {
      console.warn("JWT_SECRET is not set. Falling back to the development secret.");
    }

    if (!CLIENT_ORIGIN_ENV_KEYS.some((envKey) => process.env[envKey])) {
      console.warn(
        "No client origin environment variable is set. CORS will default to localhost origins."
      );
    }

    if (!process.env.CLOUDANT_URL) {
      console.warn("CLOUDANT_URL is not set. Set the Cloudant service URL before starting.");
    }

    if (!process.env.CLOUDANT_API_KEY) {
      console.warn("CLOUDANT_API_KEY is not set. Set the Cloudant API key before starting.");
    }

    await initializeCloudant();
    console.log("Cloudant connected");

    server.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Cloudant initialization failed:", error.message);
    process.exit(1);
  }
};

startServer();
