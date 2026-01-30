const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { createCallLog, getCallHistory } = require("../controllers/callControllers");

const router = express.Router();

router.post("/", protect, createCallLog);
router.get("/", protect, getCallHistory);

module.exports = router;
