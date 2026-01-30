const asyncHandler = require("express-async-handler");
const Call = require("../models/Call");

// @desc    Log a new call
// @route   POST /api/calls
// @access  Protected
const createCallLog = asyncHandler(async (req, res) => {
    const { receiverId, type, status, duration } = req.body;
    const callerId = req.user._id;

    if (!receiverId || !type) {
        res.status(400);
        throw new Error("Receiver and type are required");
    }

    const call = await Call.create({
        caller: callerId,
        receiver: receiverId,
        type,
        status: status || "missed",
        duration: duration || 0,
        startedAt: new Date(),
    });

    if (call) {
        const populatedCall = await Call.findById(call._id)
            .populate("caller", "name profilePic")
            .populate("receiver", "name profilePic");
        res.status(201).json(populatedCall);
    } else {
        res.status(400);
        throw new Error("Failed to create call log");
    }
});

// @desc    Get user call history
// @route   GET /api/calls
// @access  Protected
const getCallHistory = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    const calls = await Call.find({
        $or: [{ caller: userId }, { receiver: userId }]
    })
        .populate("caller", "name profilePic")
        .populate("receiver", "name profilePic")
        .sort({ createdAt: -1 })
        .limit(50);

    res.json(calls);
});

module.exports = { createCallLog, getCallHistory };
