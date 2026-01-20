const asyncHandler = require("express-async-handler");
const Notification = require("../models/Notification");

// @description     Get all Notifications for the logged-in user
// @route           GET /api/notification
// @access          Protected
const getNotifications = asyncHandler(async (req, res) => {
    const notifications = await Notification.find({ recipient: req.user._id })
        .populate("sender", "name profilePic")
        .populate("chat", "chatName")
        .sort({ createdAt: -1 });

    res.json(notifications);
});

// @description     Create a Notification (Internal or via API)
// @route           POST /api/notification
// @access          Protected
const createNotification = asyncHandler(async (req, res) => {
    const { recipientId, type, content, chatId } = req.body;

    if (!recipientId || !type || !content) {
        res.status(400);
        throw new Error("Recipient, Type, and Content are required");
    }

    const notification = await Notification.create({
        recipient: recipientId,
        sender: req.user._id,
        type,
        content,
        chat: chatId
    });

    const fullNotification = await Notification.findById(notification._id)
        .populate("sender", "name profilePic")
        .populate("chat", "chatName");

    res.status(201).json(fullNotification);
});

module.exports = { getNotifications, createNotification };
