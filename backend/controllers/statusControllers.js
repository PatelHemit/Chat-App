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
        .populate("viewedBy", "name profilePic") // Always populate so owner can see
        .sort({ createdAt: 1 });

    res.json(statuses);
});

// @description     Mark Status as Viewed
// @route           POST /api/status/:id/view
// @access          Protected
const viewStatus = asyncHandler(async (req, res) => {
    const status = await Status.findById(req.params.id);

    if (!status) {
        res.status(404);
        throw new Error("Status not found");
    }

    // Don't add owner to viewedBy
    if (status.user.toString() === req.user._id.toString()) {
        return res.status(200).json(status);
    }

    // Add user to viewedBy if not already there
    if (!status.viewedBy.includes(req.user._id)) {
        status.viewedBy.push(req.user._id);
        await status.save();
    }

    res.status(200).json(status);
});

module.exports = { createStatus, getStatuses, viewStatus };
