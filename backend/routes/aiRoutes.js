const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { chatWithAI } = require("../controllers/aiControllers");

const router = express.Router();

router.route("/chat").post(protect, chatWithAI);

module.exports = router;
