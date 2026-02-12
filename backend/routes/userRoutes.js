const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { allUsers, updateProfile, registerPushToken, blockUser, unblockUser, getBlockedUsers, deleteAccount, getBlockStatus, toggleNotifications } = require("../controllers/userControllers");

const router = express.Router();

router.route("/").get(protect, allUsers);
router.route("/update-profile").post(updateProfile);
router.route("/register-push-token").post(protect, registerPushToken);
router.route("/block").post(protect, blockUser);
router.route("/unblock").post(protect, unblockUser);
router.route("/blocked").get(protect, getBlockedUsers);
router.route("/block-status/:userId").get(protect, getBlockStatus);
router.route("/toggle-notifications").put(protect, toggleNotifications);
router.route("/delete-account").delete(protect, deleteAccount);

module.exports = router;
