const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { accessChat, fetchChats, createGroupChat, renameGroup, addToGroup, removeFromGroup, updateGroupPic, getChatDetails, deleteChat, muteChat, unmuteChat, clearChat, searchMessages } = require("../controllers/chatControllers");

const router = express.Router();

router.route("/").post(protect, accessChat);
router.route("/").get(protect, fetchChats);
router.route("/:chatId").get(protect, getChatDetails);
router.route("/group").post(protect, createGroupChat);
router.route("/rename").put(protect, renameGroup);
router.route("/groupadd").put(protect, addToGroup);
router.route("/groupremove").put(protect, removeFromGroup);
router.route("/groupPic").put(protect, updateGroupPic);
router.route("/delete").put(protect, deleteChat);
router.route("/mute/:chatId").put(protect, muteChat);
router.route("/unmute/:chatId").put(protect, unmuteChat);
router.route("/clear/:chatId").delete(protect, clearChat);
router.route("/search/:chatId").get(protect, searchMessages);

module.exports = router;
