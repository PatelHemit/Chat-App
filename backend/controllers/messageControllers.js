const asyncHandler = require("express-async-handler");
const Message = require("../models/Message");
const User = require("../models/User");
const Chat = require("../models/Chat");

// @description     Get all Messages
// @route           GET /api/message/:chatId
// @access          Protected
const allMessages = asyncHandler(async (req, res) => {
    try {
        const messages = await Message.find({
            chat: req.params.chatId,
            deletedFor: { $ne: req.user._id }
        })
            .populate("sender", "name profilePic email")
            .populate("chat");
        res.json(messages);
    } catch (error) {
        res.status(400);
        throw new Error(error.message);
    }
});

// @description     Create New Message
// @route           POST /api/message
// @access          Protected
const sendMessage = asyncHandler(async (req, res) => {
    const { content, chatId, type, replyTo, fileUrl, duration, fileMetadata } = req.body;

    if (!content || !chatId) {
        console.log("Invalid data passed into request");
        return res.sendStatus(400);
    }

    var newMessage = {
        sender: req.user._id,
        content: content,
        chat: chatId,
        type: type || "text",
        duration: duration || 0,
        fileUrl: fileUrl,
        fileMetadata: fileMetadata,
        replyTo: replyTo
    };

    try {
        const chat = await Chat.findById(chatId);
        if (!chat) {
            res.status(404);
            throw new Error("Chat not found");
        }

        // Check if either user has blocked the other (only for 1-on-1 chats)
        if (!chat.isGroupChat) {
            const otherUserId = chat.users.find(id => {
                const uid = id._id ? id._id.toString() : id.toString();
                return uid !== req.user._id.toString();
            });

            if (otherUserId) {
                const targetId = otherUserId._id ? otherUserId._id.toString() : otherUserId.toString();
                const currentUser = await User.findById(req.user._id);
                const otherUser = await User.findById(targetId);

                if (currentUser && currentUser.blockedUsers && currentUser.blockedUsers.some(id => id.toString() === targetId)) {
                    res.status(403);
                    throw new Error("You have blocked this user");
                }
                if (otherUser && otherUser.blockedUsers && otherUser.blockedUsers.some(id => id.toString() === req.user._id.toString())) {
                    res.status(403);
                    throw new Error("You are blocked by this user");
                }
            }
        }

        // If it's an announcement group, only admin can send
        if (chat.isAnnouncementGroup && chat.groupAdmin.toString() !== req.user._id.toString()) {
            res.status(401);
            throw new Error("Only admins can send messages in the announcement group");
        }

        var message = await Message.create(newMessage);

        message = await message.populate("sender", "name profilePic");
        message = await message.populate("chat");
        message = await message.populate("replyTo");
        message = await User.populate(message, {
            path: "chat.users",
            select: "name profilePic email",
        });


        await Chat.findByIdAndUpdate(req.body.chatId, {
            latestMessage: message,
            $set: { hiddenFor: [] }  // Unhide chat for all users when new message arrives
        });

        res.json(message);
    } catch (error) {
        res.status(400);
        throw new Error(error.message);
    }
});

// @description     Delete Message For Everyone
// @route           DELETE /api/message/:id
// @access          Protected
const deleteMessage = asyncHandler(async (req, res) => {
    try {
        const message = await Message.findById(req.params.id);

        if (!message) {
            res.status(404);
            throw new Error("Message not found");
        }

        // Check if user is the sender
        if (message.sender.toString() !== req.user._id.toString()) {
            res.status(401);
            throw new Error("You can't delete this message for everyone");
        }

        await Message.findByIdAndDelete(req.params.id);

        // Broadcast to all users in the chat
        const io = req.app.get("io");
        if (io) {
            io.to(message.chat.toString()).emit("message-deleted-everyone", req.params.id);
        }

        res.json({ message: "Message deleted for everyone", id: req.params.id });
    } catch (error) {
        res.status(400);
        throw new Error(error.message);
    }
});

// @description     Delete Message For Me (Soft Delete)
// @route           POST /api/message/delete-for-me
// @access          Protected
const deleteMessageForMe = asyncHandler(async (req, res) => {
    try {
        const { messageId } = req.body;
        const message = await Message.findById(messageId);

        if (!message) {
            res.status(404);
            throw new Error("Message not found");
        }

        // Add user to deletedFor array if not already there
        if (!message.deletedFor.includes(req.user._id)) {
            message.deletedFor.push(req.user._id);
            await message.save();
        }

        res.json({ message: "Message deleted for you", id: messageId });
    } catch (error) {
        res.status(400);
        throw new Error(error.message);
    }
});

// @description     Add/Update Reaction
// @route           PUT /api/message/react
// @access          Protected
const addReaction = asyncHandler(async (req, res) => {
    const { messageId, emoji } = req.body;
    var message = await Message.findById(messageId);

    if (message) {
        const existingReaction = message.reactions.find(r => r.user.toString() === req.user._id.toString());
        if (existingReaction) {
            existingReaction.emoji = emoji;
        } else {
            message.reactions.push({ user: req.user._id, emoji });
        }
        await message.save();

        message = await message.populate("sender", "name profilePic");

        // Broadcast reaction to all users in the chat
        const io = req.app.get("io");
        if (io) {
            io.to(message.chat.toString()).emit("reaction-updated", {
                messageId: message._id,
                reactions: message.reactions
            });
        }

        res.json(message);
    } else {
        res.status(404);
        throw new Error("Message not found");
    }
});

// @description     Remove Reaction
// @route           PUT /api/message/unreact
// @access          Protected
const removeReaction = asyncHandler(async (req, res) => {
    const { messageId } = req.body;
    var message = await Message.findById(messageId);

    if (message) {
        message.reactions = message.reactions.filter(r => r.user.toString() !== req.user._id.toString());
        await message.save();

        // Broadcast update
        const io = req.app.get("io");
        if (io) {
            io.to(message.chat.toString()).emit("reaction-updated", {
                messageId: message._id,
                reactions: message.reactions
            });
        }

        res.json(message);
    } else {
        res.status(404);
        throw new Error("Message not found");
    }
});

const toggleStar = asyncHandler(async (req, res) => {
    const { messageId } = req.body;
    const message = await Message.findById(messageId);

    if (message) {
        const isStarred = message.starredBy.includes(req.user._id);
        if (isStarred) {
            message.starredBy = message.starredBy.filter(id => id.toString() !== req.user._id.toString());
        } else {
            message.starredBy.push(req.user._id);
        }
        await message.save();
        res.json(message);
    } else {
        res.status(404);
        throw new Error("Message not found");
    }
});

const getMessageInfo = asyncHandler(async (req, res) => {
    try {
        const message = await Message.findById(req.params.id)
            .populate("readBy.user", "name profilePic phone")
            .populate("deliveredTo.user", "name profilePic phone")
            .populate({
                path: "chat",
                populate: {
                    path: "users",
                    select: "name profilePic phone"
                }
            });

        if (!message) {
            res.status(404);
            throw new Error("Message not found");
        }

        res.json(message);
    } catch (error) {
        res.status(400);
        throw new Error(error.message);
    }
});

module.exports = {
    allMessages,
    sendMessage,
    deleteMessage,
    deleteMessageForMe,
    addReaction,
    removeReaction,
    toggleStar,
    getMessageInfo
};
