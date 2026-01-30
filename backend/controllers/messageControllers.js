const asyncHandler = require("express-async-handler");
const Message = require("../models/Message");
const User = require("../models/User");
const Chat = require("../models/Chat");

// @description     Get all Messages
// @route           GET /api/message/:chatId
// @access          Protected
const allMessages = asyncHandler(async (req, res) => {
    try {
        const messages = await Message.find({ chat: req.params.chatId })
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
    const { content, chatId, type } = req.body;

    if (!content || !chatId) {
        console.log("Invalid data passed into request");
        return res.sendStatus(400);
    }

    var newMessage = {
        sender: req.user._id,
        content: content,
        chat: chatId,
        type: type || "text",
        duration: req.body.duration || 0,
    };

    try {
        const chat = await Chat.findById(chatId);
        if (!chat) {
            res.status(404);
            throw new Error("Chat not found");
        }

        // If it's an announcement group, only admin can send
        if (chat.isAnnouncementGroup && chat.groupAdmin.toString() !== req.user._id.toString()) {
            res.status(401);
            throw new Error("Only admins can send messages in the announcement group");
        }

        var message = await Message.create(newMessage);

        message = await message.populate("sender", "name profilePic");
        message = await message.populate("chat");
        message = await User.populate(message, {
            path: "chat.users",
            select: "name profilePic email",
        });

        await Chat.findByIdAndUpdate(req.body.chatId, { latestMessage: message });

        res.json(message);
    } catch (error) {
        res.status(400);
        throw new Error(error.message);
    }
});

// @description     Delete Message
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
            throw new Error("You can't delete this message");
        }

        await Message.findByIdAndDelete(req.params.id);
        res.json({ message: "Message removed" });
    } catch (error) {
        res.status(400);
        throw new Error(error.message);
    }
});

module.exports = { allMessages, sendMessage, deleteMessage };
