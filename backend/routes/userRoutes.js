const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { allUsers, updateProfile, registerPushToken, registerFcmToken, blockUser, unblockUser, getBlockedUsers, deleteAccount, getBlockStatus, toggleNotifications, updatePublicKey } = require("../controllers/userControllers");


const router = express.Router();

router.route("/").get(protect, allUsers);
router.route("/update-profile").post(updateProfile);
router.route("/register-push-token").post(protect, registerPushToken);
router.route("/register-fcm-token").post(protect, registerFcmToken);
router.route("/block").post(protect, blockUser);
router.route("/unblock").post(protect, unblockUser);
router.route("/update-public-key").post(protect, updatePublicKey);
router.route("/blocked").get(protect, getBlockedUsers);
router.route("/block-status/:userId").get(protect, getBlockStatus);
router.route("/toggle-notifications").put(protect, toggleNotifications);
router.route("/delete-account").delete(protect, deleteAccount);
router.route("/test-push").post(protect, require("../controllers/userControllers").testPushNotification);
router.route("/test-call-push").post(protect, require("../controllers/userControllers").testCallPushNotification);

module.exports = router;
