const asyncHandler = require("express-async-handler");
const Call = require("../models/Call");

// @description     Log a new Call
// @route           POST /api/call
// @access          Protected
const logCall = asyncHandler(async (req, res) => {
    const { receiverId, type, status, duration } = req.body;

    if (!receiverId) {
        res.status(400);
        throw new Error("Receiver ID is required");
    }

    const newCall = await Call.create({
        caller: req.user._id,
        receiver: receiverId,
        type: type || "audio",
        status: status || "missed",
        duration: duration || 0
    });

    res.status(201).json(newCall);
});

// @description     Get Call History
// @route           GET /api/call
// @access          Protected
const getCallHistory = asyncHandler(async (req, res) => {
    const myId = req.user._id;

    const calls = await Call.find({
        $or: [
            { caller: myId },
            { receiver: myId }
        ]
    })
        .populate("caller", "name profilePic")
        .populate("receiver", "name profilePic")
        .sort({ createdAt: -1 });

    res.json(calls);
});

module.exports = { logCall, getCallHistory };
