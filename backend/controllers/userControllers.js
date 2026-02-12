const asyncHandler = require("express-async-handler");
const User = require("../models/User");

// @description     Get or Search all users
// @route           GET /api/user?search=
// @access          Protected
const allUsers = asyncHandler(async (req, res) => {
    const keyword = req.query.search
        ? {
            $or: [
                { name: { $regex: req.query.search, $options: "i" } },
                { phone: { $regex: req.query.search, $options: "i" } },
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
    console.log(`[PushToken] Register request from user ${req.user._id}:`, pushToken);

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
        console.log(`[PushToken] Adding new token: ${pushToken.substring(0, 20)}...`);
        user.pushTokens.push(pushToken);
        await user.save();
        console.log(`[PushToken] Token saved successfully`);
    } else {
        console.log(`[PushToken] Token already exists for user`);
    }

    res.json({ success: true, message: "Push token registered" });
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

module.exports = { allUsers, updateProfile, registerPushToken, blockUser, unblockUser, getBlockedUsers, deleteAccount, getBlockStatus, toggleNotifications };
