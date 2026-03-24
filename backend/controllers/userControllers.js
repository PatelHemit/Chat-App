const asyncHandler = require("express-async-handler");
const User = require("../models/User");
const logNotif = require("../utils/logger");

// @description     Get or Search all users
// @route           GET /api/user?search=
// @access          Protected
const allUsers = asyncHandler(async (req, res) => {
    const search = req.query.search ? req.query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : "";
    const keyword = search
        ? {
            $or: [
                { name: { $regex: search, $options: "i" } },
                { phone: { $regex: search, $options: "i" } },
            ],
        }
        : {};

    const users = await User.find(keyword).find({ _id: { $ne: req.user._id } });
    res.send(users);
});

// @description     Update User Profile
// @route           POST /api/user/update-profile
// @access          Public
const updateProfile = asyncHandler(async (req, res) => {
    const { phone, name, about, profilePic } = req.body;
    if (!phone) {
        res.status(400);
        throw new Error("Phone is required to update profile");
    }

    const user = await User.findOneAndUpdate(
        { phone },
        { name, about, profilePic, notificationsMuted: req.body.notificationsMuted },
        { new: true } // Return updated document
    );

    if (!user) {
        res.status(404);
        throw new Error("User not found");
    }

    res.json({ success: true, user });
});


// @description     Register Push Token
// @route           POST /api/user/register-push-token
// @access          Protected
const registerPushToken = asyncHandler(async (req, res) => {
    const { pushToken } = req.body;
    logNotif(`[PushToken] Register request from user ${req.user._id}: ${pushToken}`);

    if (!pushToken) {
        console.log(`[PushToken] Error: Token missing in payload`);
        res.status(400);
        throw new Error("Push token is required");
    }

    const user = await User.findById(req.user._id);

    if (!user) {
        console.log(`[PushToken] Error: User ${req.user._id} not found`);
        res.status(404);
        throw new Error("User not found");
    }

    console.log(`[PushToken] Registering for user: ${user.name || user.phone}`);

    // Ensure pushTokens is an array
    if (!user.pushTokens) {
        console.log(`[PushToken] Initializing pushTokens array for user`);
        user.pushTokens = [];
    }

    // Add token if it doesn't already exist
    if (!user.pushTokens.includes(pushToken)) {
        logNotif(`[PushToken] Adding new token for ${user.name || user.phone}`);
        user.pushTokens.push(pushToken);
        await user.save();
        logNotif(`[PushToken] Token saved successfully`);
    } else {
        logNotif(`[PushToken] Token already exists for user ${user.name || user.phone}`);
    }

    res.json({ success: true, message: "Push token registered" });
});

// @description     Register FCM Token
// @route           POST /api/user/register-fcm-token
// @access          Protected
const registerFcmToken = asyncHandler(async (req, res) => {
    const { fcmToken } = req.body;
    logNotif(`[FCMToken] Register request from user ${req.user._id}: ${fcmToken?.substring(0, 20)}...`);

    if (!fcmToken) {
        res.status(400);
        throw new Error("FCM token is required");
    }

    const user = await User.findById(req.user._id);
    if (!user) {
        res.status(404);
        throw new Error("User not found");
    }

    if (!user.fcmTokens) user.fcmTokens = [];

    if (!user.fcmTokens.includes(fcmToken)) {
        logNotif(`[FCMToken] Adding new FCM token for ${user.name || user.phone}`);
        user.fcmTokens.push(fcmToken);
        await user.save();
        logNotif(`[FCMToken] FCM Token saved successfully`);
    } else {
        logNotif(`[FCMToken] FCM Token already exists for ${user.name || user.phone}`);
    }

    res.json({ success: true, message: "FCM token registered" });
});

// @description     Block a User
// @route           POST /api/user/block
// @access          Protected
const blockUser = asyncHandler(async (req, res) => {
    const { userId } = req.body;

    if (!userId) {
        res.status(400);
        throw new Error("User ID is required");
    }

    const user = await User.findById(req.user._id);
    if (!user) {
        res.status(404);
        throw new Error("User not found");
    }

    console.log(`[Block] User ${req.user._id} blocking ${userId}`);

    // Ensure blockedUsers is an array
    if (!user.blockedUsers) user.blockedUsers = [];

    if (!user.blockedUsers.some(id => id.toString() === userId.toString())) {
        user.blockedUsers.push(userId);
        await user.save();
        console.log(`[Block] Success: ${userId} added to ${req.user._id}'s block list`);
    } else {
        console.log(`[Block] User already blocked`);
    }

    res.json({ success: true, message: "User blocked", isBlocked: true });
});

// @description     Unblock a User
// @route           POST /api/user/unblock
// @access          Protected
const unblockUser = asyncHandler(async (req, res) => {
    const { userId } = req.body;

    if (!userId) {
        res.status(400);
        throw new Error("User ID is required");
    }

    const user = await User.findById(req.user._id);
    if (!user) {
        res.status(404);
        throw new Error("User not found");
    }

    console.log(`[Unblock] User ${req.user._id} unblocking ${userId}`);

    if (user.blockedUsers) {
        const initialCount = user.blockedUsers.length;
        user.blockedUsers = user.blockedUsers.filter(id => id.toString() !== userId.toString());
        await user.save();
        console.log(`[Unblock] Success: Removed ${userId}. Count from ${initialCount} to ${user.blockedUsers.length}`);
    }

    res.json({ success: true, message: "User unblocked", isBlocked: false });
});

// @description     Get Blocked Users
// @route           GET /api/user/blocked
// @access          Protected
const getBlockedUsers = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id).populate("blockedUsers", "name phone profilePic about");
    res.json(user ? user.blockedUsers : []);
});

// @description     Get Block Status
// @route           GET /api/user/block-status/:userId
// @access          Protected
const getBlockStatus = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const currentUser = await User.findById(req.user._id);
    const otherUser = await User.findById(userId);

    if (!currentUser || !otherUser) {
        res.status(404);
        throw new Error("User not found");
    }

    const isBlockedByMe = (currentUser.blockedUsers || []).some(id => id.toString() === userId.toString());
    const isBlockingMe = (otherUser.blockedUsers || []).some(id => id.toString() === req.user._id.toString());

    res.json({ isBlockedByMe, isBlockingMe });
});

// @description     Delete User Account
// @route           DELETE /api/user/delete-account
// @access          Protected
const deleteAccount = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const Chat = require("../models/Chat");
    const Message = require("../models/Message");

    // 1. Delete user's messages
    await Message.deleteMany({ sender: userId });

    // 2. Remove user from all chats
    await Chat.updateMany(
        { users: userId },
        { $pull: { users: userId } }
    );

    await User.findByIdAndDelete(userId);

    res.json({ success: true, message: "Account deleted successfully" });
});

// @description     Toggle Global Notifications
// @route           PUT /api/user/toggle-notifications
// @access          Protected
const toggleNotifications = asyncHandler(async (req, res) => {
    const { notificationsMuted } = req.body;

    const user = await User.findByIdAndUpdate(
        req.user._id,
        { notificationsMuted },
        { new: true }
    );

    if (!user) {
        res.status(404);
        throw new Error("User not found");
    }

    res.json({ success: true, notificationsMuted: user.notificationsMuted });
});

// @description     Test Push Notification
// @route           POST /api/user/test-push
// @access          Protected
const testPushNotification = asyncHandler(async (req, res) => {
    const { sendPushNotification } = require("./notificationControllers");
    const user = await User.findById(req.user._id);

    if (!user || !user.pushTokens || user.pushTokens.length === 0) {
        res.status(400);
        throw new Error("User has no push tokens registered");
    }

    logNotif(`[Test-Push] Sending test notification to ${user.name} (${user.pushTokens.length} tokens)`);

    const tickets = await sendPushNotification(
        user.pushTokens,
        "Test Notification",
        "This is a test notification from the app!",
        { type: "test" }
    );

    res.json({ success: true, tickets });
});

// @description     Test Call Notification
// @route           POST /api/user/test-call-push
// @access          Protected
const testCallPushNotification = asyncHandler(async (req, res) => {
    const { Expo } = require("expo-server-sdk");
    const admin = require("firebase-admin");
    const expo = new Expo();
    const user = await User.findById(req.user._id);

    if (!user) {
        res.status(404);
        throw new Error("User not found");
    }

    const results = { expo: [], fcm: [] };

    // 1. Send Expo Push Notification (for Heads-up)
    if (user.pushTokens && user.pushTokens.length > 0) {
        const messages = [];
        for (let pushToken of user.pushTokens) {
            if (Expo.isExpoPushToken(pushToken)) {
                messages.push({
                    to: pushToken,
                    sound: 'default',
                    title: 'Test Incoming Call',
                    body: 'This is a high-priority call test notification',
                    data: {
                        type: 'incoming-call',
                        from: { _id: user._id.toString(), name: 'Test Sender' },
                        roomName: 'test-room-' + Date.now(),
                        isVideoCall: false,
                        callId: 'test-id'
                    },
                    priority: 'high',
                    channelId: 'incoming-calls',
                    categoryIdentifier: 'incoming-call'
                });
            }
        }

        if (messages.length > 0) {
            let chunks = expo.chunkPushNotifications(messages);
            for (let chunk of chunks) {
                let ticketChunk = await expo.sendPushNotificationsAsync(chunk);
                results.expo.push(...ticketChunk);
            }
        }
    }

    // 2. Send FCM Data Message (for CallKeep Background UI)
    if (user.fcmTokens && user.fcmTokens.length > 0) {
        logNotif(`[Test-Call] Sending FCM data messages to ${user.name} (${user.fcmTokens.length} tokens)`);
        for (const fcmToken of user.fcmTokens) {
            try {
                const fcmMessage = {
                    token: fcmToken,
                    data: {
                        type: 'incoming-call',
                        callerId: user._id.toString(),
                        callerName: 'Test Caller',
                        roomName: 'test-room-' + Date.now(),
                        isVideoCall: 'false',
                        callId: 'test-call-id',
                        sender: JSON.stringify({ _id: user._id, name: 'Test Caller' })
                    },
                    android: {
                        priority: 'high',
                        ttl: 30000,
                    },
                };
                const fcmResult = await admin.messaging().send(fcmMessage);
                results.fcm.push({ token: fcmToken.substring(0, 10), success: true, result: fcmResult });
            } catch (fcmErr) {
                results.fcm.push({ token: fcmToken.substring(0, 10), success: false, error: fcmErr.message });
            }
        }
    }

    res.json({ success: true, results });
});

// @description     Update User Public Key for E2EE
// @route           POST /api/user/update-public-key
// @access          Protected
const updatePublicKey = asyncHandler(async (req, res) => {
    const { publicKey } = req.body;

    if (!publicKey) {
        res.status(400);
        throw new Error("Public key is required");
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        { publicKey },
        { new: true }
    );

    if (!user) {
        res.status(404);
        throw new Error("User not found");
    }

    res.json({ success: true, message: "Public key updated successfully" });
});

// @description     Logout User (remove push tokens)
// @route           POST /api/user/logout
// @access          Protected
const logoutUser = asyncHandler(async (req, res) => {
    const { pushToken, fcmToken } = req.body;
    logNotif(`[Logout] Request from user ${req.user._id}. Removing tokens: Push=${!!pushToken}, FCM=${!!fcmToken}`);

    const user = await User.findById(req.user._id);

    if (!user) {
        res.status(404);
        throw new Error("User not found");
    }

    let modified = false;

    if (pushToken && user.pushTokens) {
        const initialCount = user.pushTokens.length;
        user.pushTokens = user.pushTokens.filter(t => t !== pushToken);
        if (user.pushTokens.length !== initialCount) modified = true;
    }

    if (fcmToken && user.fcmTokens) {
        const initialCount = user.fcmTokens.length;
        user.fcmTokens = user.fcmTokens.filter(t => t !== fcmToken);
        if (user.fcmTokens.length !== initialCount) modified = true;
    }

    if (modified) {
        await user.save();
        logNotif(`[Logout] Tokens removed successfully for ${user.name || user.phone}`);
    } else {
        logNotif(`[Logout] No matching tokens found for removal`);
    }

    res.json({ success: true, message: "Logged out and tokens removed" });
});

module.exports = { allUsers, updateProfile, registerPushToken, registerFcmToken, blockUser, unblockUser, getBlockedUsers, deleteAccount, getBlockStatus, toggleNotifications, testPushNotification, testCallPushNotification, updatePublicKey, logoutUser };
