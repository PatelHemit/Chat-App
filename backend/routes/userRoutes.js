const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { allUsers, updateProfile } = require("../controllers/userControllers");

const router = express.Router();

router.route("/").get(protect, allUsers);
router.route("/update-profile").post(updateProfile);

module.exports = router;
