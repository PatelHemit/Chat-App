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
const { Expo } = require('expo-server-sdk');
const expo = new Expo();

const sendPushNotification = async (expoPushTokens, title, body, data = {}) => {
    console.log(`[Push] sendPushNotification called with ${expoPushTokens.length} tokens`);

    // Filter valid tokens
    let validTokens = expoPushTokens.filter(token => Expo.isExpoPushToken(token));
    console.log(`[Push] Valid tokens count: ${validTokens.length}`);

    if (validTokens.length === 0) {
        console.log("[Push] NO VALID TOKENS FOUND, skipping push");
        return;
    }

    let messages = [];
    for (let token of validTokens) {
        messages.push({
            to: token,
            sound: 'default',
            title: title,
            body: body,
            data: data,
            priority: 'high',
            channelId: 'chat-messages', // Match the new frontend channel
        });
    }

    // Chunk and send
    let chunks = expo.chunkPushNotifications(messages);
    let tickets = [];
    for (let chunk of chunks) {
        try {
            console.log(`[Push] Sending chunk to Expo with ${chunk.length} messages...`);
            let ticketChunk = await expo.sendPushNotificationsAsync(chunk);
            console.log("[Push] Tickets received from Expo:", JSON.stringify(ticketChunk));
            tickets.push(...ticketChunk);
        } catch (error) {
            console.error('[Push] ERROR sending chunk to Expo:', error);
        }
    }
    return tickets;
};

module.exports = { getNotifications, createNotification, markAsRead, sendPushNotification };
