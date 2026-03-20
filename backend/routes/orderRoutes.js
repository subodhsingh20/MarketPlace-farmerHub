const express = require("express");
const {
  getFarmerAnalytics,
  getFarmerOrders,
  getUserOrders,
  placeOrder,
  updateOrderStatus,
} = require("../controllers/orderController");
const { authorizeRoles, protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/", protect, authorizeRoles("customer"), placeOrder);
router.get("/my-orders", protect, authorizeRoles("customer"), getUserOrders);
router.get("/farmer", protect, authorizeRoles("farmer"), getFarmerOrders);
router.get("/farmer/analytics", protect, authorizeRoles("farmer"), getFarmerAnalytics);
router.patch("/:orderId/status", protect, authorizeRoles("farmer"), updateOrderStatus);

module.exports = router;
