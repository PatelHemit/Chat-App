const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { allUsers } = require("../controllers/userControllers");

const router = express.Router();

router.route("/").get(protect, allUsers);

module.exports = router;
