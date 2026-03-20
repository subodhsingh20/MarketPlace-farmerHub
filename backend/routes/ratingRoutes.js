const express = require("express");
const { rateFarmer, rateProduct } = require("../controllers/ratingController");
const { authorizeRoles, protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/products/:id", protect, authorizeRoles("customer"), rateProduct);
router.post("/farmers/:id", protect, authorizeRoles("customer"), rateFarmer);

module.exports = router;
