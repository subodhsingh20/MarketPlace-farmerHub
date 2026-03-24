const express = require("express");
const {
  geocodeAddressLookup,
  loginUser,
  registerUser,
} = require("../controllers/authController");

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/geocode", geocodeAddressLookup);

module.exports = router;
