const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { chatWithAI, getAiHistory } = require("../controllers/aiControllers");

const router = express.Router();

router.route("/chat").post(protect, chatWithAI);
router.route("/history").get(protect, getAiHistory);

module.exports = router;
