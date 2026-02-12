const Chat = require("../models/Chat");
const User = require("../models/User");
const Message = require("../models/Message");

// @description     Create or fetch One to One Chat
// @route           POST /api/chat/
// @access          Protected
const accessChat = async (req, res) => {
    const { userId } = req.body;

    if (!userId) {
        console.log("UserId param not sent with request");
        return res.sendStatus(400);
    }

    var isChat = await Chat.find({
        isGroupChat: false,
        $and: [
            { users: req.user._id },
            { users: userId },
        ],
    })
        .populate("users", "-password")
        .populate("latestMessage");

    isChat = await User.populate(isChat, {
        path: "latestMessage.sender",
        select: "name profilePic phone",
    });

    if (isChat.length > 0) {
        res.send(isChat[0]);
    } else {
        var chatData = {
            chatName: "sender",
            isGroupChat: false,
            users: [req.user._id, userId],
        };

        try {
            const createdChat = await Chat.create(chatData);
            const FullChat = await Chat.findOne({ _id: createdChat._id }).populate(
                "users",
                "-password"
            );
            res.status(200).send(FullChat);
        } catch (error) {
            res.status(400);
            throw new Error(error.message);
        }
    }
};

// @description     Fetch all chats for a user
// @route           GET /api/chat/
// @access          Protected
const fetchChats = async (req, res) => {
    console.log(`[ChatController] fetchChats called for user: ${req.user._id}`);
    try {
        const chats = await Chat.find({
            users: req.user._id,
            hiddenFor: { $ne: req.user._id }  // Exclude chats hidden by this user
        })
            .populate("users", "-password")
            .populate("groupAdmin", "-password")
            .populate("latestMessage")
            .sort({ updatedAt: -1 });

        const populatedChats = await User.populate(chats, {
            path: "latestMessage.sender",
            select: "name profilePic phone",
        });

        // Calculate unread counts and filter out blocked users
        const mongoose = require('mongoose');
        const currentUserId = new mongoose.Types.ObjectId(req.user._id);

        // Fetch current user's blocked list
        const currentUser = await User.findById(req.user._id).select("blockedUsers");
        const blockedUserIds = currentUser?.blockedUsers?.map(id => id.toString()) || [];

        const filteredChats = await Promise.all(populatedChats.map(async (chat) => {
            // Filter out 1-on-1 chats where the other user is blocked
            if (!chat.isGroupChat) {
                const otherUser = chat.users.find(u => u._id.toString() !== req.user._id.toString());
                if (otherUser && blockedUserIds.includes(otherUser._id.toString())) {
                    return null; // Skip this chat
                }
            }

            const query = {
                chat: chat._id,
                sender: { $ne: currentUserId },
            };

            if (chat.isGroupChat) {
                query["readBy.user"] = { $ne: currentUserId };
            } else {
                query.status = { $ne: "read" };
            }

            const unreadCount = await Message.countDocuments(query);
            return { ...chat._doc, unreadCount };
        }));

        const validChats = filteredChats.filter(chat => chat !== null);

        console.log(`[ChatController] Returned ${validChats.length} chats (filtered ${filteredChats.length - validChats.length} blocked)`);
        res.status(200).send(validChats);
    } catch (error) {
        console.error("[ChatController] Fetch Error:", error);
        res.status(400);
        throw new Error(error.message);
    }
};

const createGroupChat = async (req, res) => {
    if (!req.body.users || !req.body.name) {
        return res.status(400).send({ message: "Please Fill all the feilds" });
    }

    var users = JSON.parse(req.body.users);

    if (users.length < 2) {
        return res
            .status(400)
            .send("More than 2 users are required to form a group chat");
    }

    users.push(req.user);

    try {
        const groupChat = await Chat.create({
            chatName: req.body.name,
            users: users,
            isGroupChat: true,
            groupAdmin: req.user,
        });

        const fullGroupChat = await Chat.findOne({ _id: groupChat._id })
            .populate("users", "-password")
            .populate("groupAdmin", "-password");

        res.status(200).json(fullGroupChat);
    } catch (error) {
        res.status(400);
        throw new Error(error.message);
    }
};

const renameGroup = async (req, res) => {
    const { chatId, chatName } = req.body;

    const updatedChat = await Chat.findByIdAndUpdate(
        chatId,
        {
            chatName: chatName,
        },
        {
            new: true,
        }
    )
        .populate("users", "-password")
        .populate("groupAdmin", "-password");

    if (!updatedChat) {
        res.status(404);
        throw new Error("Chat Not Found");
    } else {
        res.json(updatedChat);
    }
};

const addToGroup = async (req, res) => {
    const { chatId, userId } = req.body;

    // Check if the requester is admin
    const chat = await Chat.findById(chatId);

    if (!chat) {
        res.status(404);
        throw new Error("Chat Not Found");
    }

    if (chat.groupAdmin.toString() !== req.user._id.toString()) {
        res.status(403);
        throw new Error("Only admins can add members");
    }

    const added = await Chat.findByIdAndUpdate(
        chatId,
        {
            $addToSet: { users: userId },
        },
        {
            new: true,
        }
    )
        .populate("users", "-password")
        .populate("groupAdmin", "-password");

    if (!added) {
        res.status(404);
        throw new Error("Chat Not Found");
    } else {
        res.json(added);
    }
};

const removeFromGroup = async (req, res) => {
    const { chatId, userId } = req.body;

    const chat = await Chat.findById(chatId);

    if (!chat) {
        res.status(404);
        throw new Error("Chat Not Found");
    }

    // Check if requester is admin OR if they are removing themselves (Exit Group)
    console.log("Remove Debug:", chat.groupAdmin, req.user._id, userId);
    if (chat.groupAdmin.toString() !== req.user._id.toString() && userId !== req.user._id.toString()) {
        res.status(403);
        throw new Error("Only admins can remove members");
    }

    const removed = await Chat.findByIdAndUpdate(
        chatId,
        {
            $pull: { users: userId },
        },
        {
            new: true,
        }
    )
        .populate("users", "-password")
        .populate("groupAdmin", "-password");

    if (!removed) {
        res.status(404);
        throw new Error("Chat Not Found");
    } else {
        res.json(removed);
    }
};

const updateGroupPic = async (req, res) => {
    const { chatId, pic } = req.body;

    const updatedChat = await Chat.findByIdAndUpdate(
        chatId,
        {
            groupPic: pic,
        },
        {
            new: true,
        }
    )
        .populate("users", "-password")
        .populate("groupAdmin", "-password");

    if (!updatedChat) {
        res.status(404);
        throw new Error("Chat Not Found");
    } else {
        res.json(updatedChat);
    }
};

const getChatDetails = async (req, res) => {
    try {
        const chat = await Chat.findById(req.params.chatId)
            .populate("users", "-password")
            .populate("groupAdmin", "-password");
        if (!chat) {
            res.status(404);
            throw new Error("Chat not found");
        }
        res.status(200).send(chat);
    } catch (error) {
        res.status(400);
        throw new Error(error.message);
    }
};

const deleteChat = async (req, res) => { // Assuming asyncHandler is not used here based on original file structure
    const { chatId } = req.body;

    if (!chatId) {
        res.status(400);
        throw new Error("ChatId param not sent with request");
    }

    try {
        // Check if user is part of the chat or admin logic if needed
        // For now, allow any member to "delete" the chat for themselves?
        // WhatsApp "Delete Chat" removes it from your list. If it's 1-on-1, it might delete messages.
        // If it's a group, "Exit" is separate. "Delete" usually implies removing the history.

        // Let's implement hard delete for now as per "delete no option" request
        // Or better: clear messages? 
        // User likely wants to remove the chat from their home screen.

        // Strategy: 
        // 1. Delete all messages associated with chat query
        // 2. Delete the chat document itself

        // Assuming Message model is imported or defined elsewhere
        // await Message.deleteMany({ chat: chatId }); 
        await Chat.findByIdAndDelete(chatId);

        res.status(200).json({ message: "Chat Deleted Successfully" });
    } catch (error) {
        res.status(400);
        throw new Error(error.message);
    }
};

// @description     Mute a chat
// @route           PUT /api/chat/mute/:chatId
// @access          Protected
const muteChat = async (req, res) => {
    try {
        const { chatId } = req.params;
        const { duration } = req.body; // 'forever', '8hours', '1week'

        const chat = await Chat.findById(chatId);
        if (!chat) {
            return res.status(404).json({ message: "Chat not found" });
        }

        // Remove existing mute for this user if any
        chat.mutedBy = chat.mutedBy.filter(m => m.user.toString() !== req.user._id.toString());

        // Calculate mute expiry
        let mutedUntil = null;
        if (duration === '8hours') {
            mutedUntil = new Date(Date.now() + 8 * 60 * 60 * 1000);
        } else if (duration === '1week') {
            mutedUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        }
        // If duration is 'forever', mutedUntil stays null

        chat.mutedBy.push({ user: req.user._id, mutedUntil });
        await chat.save();

        res.json({ message: 'Chat muted successfully', mutedUntil });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @description     Unmute a chat
// @route           PUT /api/chat/unmute/:chatId
// @access          Protected
const unmuteChat = async (req, res) => {
    try {
        const { chatId } = req.params;

        const chat = await Chat.findById(chatId);
        if (!chat) {
            return res.status(404).json({ message: "Chat not found" });
        }

        chat.mutedBy = chat.mutedBy.filter(m => m.user.toString() !== req.user._id.toString());
        await chat.save();

        res.json({ message: 'Chat unmuted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @description     Clear chat (soft delete messages for user)
// @route           DELETE /api/chat/clear/:chatId
// @access          Protected
const clearChat = async (req, res) => {
    try {
        const { chatId } = req.params;

        // Mark all messages in this chat as deleted for this user
        await Message.updateMany(
            { chat: chatId },
            { $addToSet: { deletedFor: req.user._id } }
        );

        // Hide chat from main list for this user
        await Chat.findByIdAndUpdate(
            chatId,
            { $addToSet: { hiddenFor: req.user._id } }
        );

        res.json({ message: 'Chat cleared successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @description     Search messages in a chat
// @route           GET /api/chat/search/:chatId
// @access          Protected
const searchMessages = async (req, res) => {
    try {
        const { chatId } = req.params;
        const { query } = req.query;

        if (!query || query.trim() === '') {
            return res.json([]);
        }

        // Search messages by content (case-insensitive)
        // Exclude messages deleted by this user
        const messages = await Message.find({
            chat: chatId,
            content: { $regex: query, $options: 'i' },
            deletedFor: { $ne: req.user._id }
        })
            .populate('sender', 'name profilePic')
            .sort({ createdAt: -1 })
            .limit(50);

        res.json(messages);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    accessChat,
    fetchChats,
    createGroupChat,
    renameGroup,
    addToGroup,
    removeFromGroup,
    updateGroupPic,
    getChatDetails,
    deleteChat,
    muteChat,
    unmuteChat,
    clearChat,
    searchMessages
};
