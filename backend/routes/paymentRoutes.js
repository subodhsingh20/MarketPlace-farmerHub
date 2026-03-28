const express = require("express");
const {
  createCashOnDeliveryOrder,
  createPaymentOrder,
  mockPayment,
  verifyPayment,
} = require("../controllers/paymentController");
const { authorizeRoles, protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/create-order", protect, authorizeRoles("customer"), createPaymentOrder);
router.post("/mock", protect, authorizeRoles("customer"), mockPayment);
router.post("/cod", protect, authorizeRoles("customer"), createCashOnDeliveryOrder);
router.post("/verify", protect, authorizeRoles("customer"), verifyPayment);

module.exports = router;
