const asyncHandler = require("express-async-handler");
const Notification = require("../models/Notification");
const logNotif = require("../utils/logger");

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

// Helper function to send push notification via Expo and FCM
const { Expo } = require('expo-server-sdk');
const admin = require('firebase-admin');
const expo = new Expo();

const sendPushNotification = async (expoPushTokens = [], title, body, data = {}, fcmTokens = []) => {
    logNotif(`[Push] sendPushNotification called: Expo=${expoPushTokens.length}, FCM=${fcmTokens.length}`);

    const results = { expo: null, fcm: null };

    // 1. Send via Expo
    if (expoPushTokens.length > 0) {
        let validTokens = expoPushTokens.filter(token => Expo.isExpoPushToken(token));
        if (validTokens.length > 0) {
            let messages = validTokens.map(token => ({
                to: token,
                sound: 'default',
                title: title,
                body: body,
                data: data,
                priority: 'high',
                channelId: 'chat-messages',
            }));

            let chunks = expo.chunkPushNotifications(messages);
            for (let chunk of chunks) {
                try {
                    let ticketChunk = await expo.sendPushNotificationsAsync(chunk);
                    logNotif(`[Push-Expo] Tickets: ${JSON.stringify(ticketChunk)}`);
                } catch (error) {
                    logNotif(`[Push-Expo] ERROR: ${error.message}`);
                }
            }
        }
    }

    // 2. Send via FCM (Multicast)
    if (fcmTokens.length > 0) {
        try {
            const fcmMessage = {
                tokens: fcmTokens,
                notification: {
                    title: title,
                    body: body,
                },
                data: {
                    ...data,
                    click_action: 'FLUTTER_NOTIFICATION_CLICK', // Legacy compatibility
                },
                android: {
                    priority: 'high',
                    notification: {
                        channelId: 'chat-messages',
                        icon: 'notification_icon',
                    },
                },
                apns: {
                    payload: {
                        aps: {
                            sound: 'default',
                            badge: 1,
                        },
                    },
                },
            };

            const response = await admin.messaging().sendEachForMulticast(fcmMessage);
            logNotif(`[Push-FCM] Multicast success: ${response.successCount}/${fcmTokens.length}`);
            if (response.failureCount > 0) {
                const failedTokens = [];
                response.responses.forEach((resp, idx) => {
                    if (!resp.success) failedTokens.push(fcmTokens[idx]);
                });
                logNotif(`[Push-FCM] Failed tokens count: ${failedTokens.length}`);
            }
        } catch (error) {
            logNotif(`[Push-FCM] Global ERROR: ${error.message}`);
        }
    }

    return results;
};

module.exports = { getNotifications, createNotification, markAsRead, sendPushNotification };
