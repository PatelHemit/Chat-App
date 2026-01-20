const asyncHandler = require("express-async-handler");
const Status = require("../models/Status");

// @description     Create New Status
// @route           POST /api/status
// @access          Protected
const createStatus = asyncHandler(async (req, res) => {
    const { mediaUrl, caption, mediaType } = req.body;

    if (!mediaUrl) {
        res.status(400);
        throw new Error("Media URL is required");
    }

    const newStatus = await Status.create({
        user: req.user._id,
        mediaUrl,
        mediaType: mediaType || "image",
        caption
    });

    const fullStatus = await Status.findById(newStatus._id).populate("user", "name profilePic");

    res.status(201).json(fullStatus);
});

// @description     Get All Statuses
// @route           GET /api/status
// @access          Protected
const getStatuses = asyncHandler(async (req, res) => {
    // In a real app, you might filter by friends/contacts. 
    // For now, we fetch ALL statuses to show the feature working.
    const statuses = await Status.find({
        // Optional: specific query logic here
    })
        .populate("user", "name profilePic")
        .sort({ createdAt: -1 });

    res.json(statuses);
});

module.exports = { createStatus, getStatuses };
