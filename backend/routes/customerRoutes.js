const express = require("express");
const {
  addCustomerAddress,
  deleteCustomerAddress,
  getCustomerAddresses,
  updateCustomerAddress,
} = require("../controllers/customerController");
const { authorizeRoles, protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/addresses", protect, authorizeRoles("customer"), getCustomerAddresses);
router.post("/address", protect, authorizeRoles("customer"), addCustomerAddress);
router.put("/address/:id", protect, authorizeRoles("customer"), updateCustomerAddress);
router.delete("/address/:id", protect, authorizeRoles("customer"), deleteCustomerAddress);

module.exports = router;
