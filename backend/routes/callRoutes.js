const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { createCallLog, getCallHistory, updateCallLog } = require("../controllers/callControllers");

const router = express.Router();

router.post("/", protect, createCallLog);
router.get("/", protect, getCallHistory);
router.put("/:id", protect, updateCallLog);

module.exports = router;
