const express = require("express");
const { getSpeechToTextConfig } = require("../controllers/speechController");

const router = express.Router();

router.get("/config", getSpeechToTextConfig);

module.exports = router;
