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
    };

    try {
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

module.exports = { allMessages, sendMessage };
