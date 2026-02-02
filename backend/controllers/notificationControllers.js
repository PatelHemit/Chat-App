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


// @description     Mark Notification as Read
// @route           PUT /api/notification/:id/read
// @access          Protected
const markAsRead = asyncHandler(async (req, res) => {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
        res.status(404);
        throw new Error("Notification not found");
    }

    if (notification.recipient.toString() !== req.user._id.toString()) {
        res.status(403);
        throw new Error("Not authorized to update this notification");
    }

    notification.isRead = true;
    await notification.save();

    res.json({ success: true, notification });
});

// Helper function to send push notification via Expo
const sendPushNotification = async (expoPushTokens, title, body, data = {}) => {
    const messages = expoPushTokens
        .filter(token => token && token.startsWith('ExponentPushToken'))
        .map(token => ({
            to: token,
            sound: 'default',
            title,
            body,
            data,
            priority: 'high',
        }));

    if (messages.length === 0) return;

    try {
        const response = await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(messages),
        });

        const result = await response.json();
        console.log('Push notification sent:', result);
    } catch (error) {
        console.error('Error sending push notification:', error);
    }
};

module.exports = { getNotifications, createNotification, markAsRead, sendPushNotification };
