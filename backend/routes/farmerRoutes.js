const express = require("express");
const { getNearestFarmers } = require("../controllers/farmerController");

const router = express.Router();

router.get("/nearest", getNearestFarmers);

module.exports = router;
