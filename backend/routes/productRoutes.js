const express = require("express");
const {
  addProduct,
  updateProduct,
  deleteProduct,
  getAllProducts,
  getNearbyProducts,
  getProductsByFarmer,
} = require("../controllers/productController");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", getAllProducts);
router.get("/nearby", getNearbyProducts);
router.get("/farmer/:farmerId", getProductsByFarmer);
router.post("/", protect, authorizeRoles("farmer"), addProduct);
router.put("/:id", protect, authorizeRoles("farmer"), updateProduct);
router.delete("/:id", protect, authorizeRoles("farmer"), deleteProduct);

module.exports = router;
