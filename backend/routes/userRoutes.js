const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { allUsers, updateProfile, registerPushToken } = require("../controllers/userControllers");

const router = express.Router();

router.route("/").get(protect, allUsers);
router.route("/update-profile").post(updateProfile);
router.route("/register-push-token").post(protect, registerPushToken);

module.exports = router;
