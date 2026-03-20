const express = require("express");
const {
  createPaymentOrder,
  verifyPayment,
} = require("../controllers/paymentController");
const { authorizeRoles, protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/create-order", protect, authorizeRoles("customer"), createPaymentOrder);
router.post("/verify", protect, authorizeRoles("customer"), verifyPayment);

module.exports = router;
