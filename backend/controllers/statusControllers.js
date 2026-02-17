const asyncHandler = require("express-async-handler");
const Status = require("../models/Status");

// @description     Create New Status
// @route           POST /api/status
// @access          Protected
const User = require("../models/User");

// @description     Create New Status
// @route           POST /api/status
// @access          Protected
const createStatus = asyncHandler(async (req, res) => {
    const { mediaUrl, caption, mediaType } = req.body;

    if (!mediaUrl) {
        res.status(400);
        throw new Error("Media URL is required");
    }

    const user = await User.findById(req.user._id);

    // Explicitly get the values to avoid Mongoose subdocument issues
    const privacyType = user.statusPrivacy && user.statusPrivacy.type ? user.statusPrivacy.type : 'contacts';
    const excludedList = user.statusPrivacy && user.statusPrivacy.excludedUsers ? user.statusPrivacy.excludedUsers : [];
    const allowedList = user.statusPrivacy && user.statusPrivacy.includedUsers ? user.statusPrivacy.includedUsers : [];

    const newStatus = await Status.create({
        user: req.user._id,
        mediaUrl,
        mediaType: mediaType || "image",
        caption,
        privacy: {
            type: privacyType,
            excludedList: excludedList,
            allowedList: allowedList
        }
    });

    const fullStatus = await Status.findById(newStatus._id).populate("user", "name profilePic");
    res.status(201).json(fullStatus);
});

// @description     Get All Statuses (Filtered by Privacy)
// @route           GET /api/status
// @access          Protected
const getStatuses = asyncHandler(async (req, res) => {
    const mongoose = require("mongoose");
    const currentUserId = new mongoose.Types.ObjectId(req.user._id);

    // Filter logic:
    // 1. Own statuses
    // 2. Public/Contacts statuses
    // 3. Except logic: user NOT in excludedList
    // 4. Only logic: user IN allowedList

    // If strict contacts check is needed, we'd need to check mutuals.

    const statuses = await Status.find({
        $or: [
            { user: currentUserId }, // My statuses
            {
                "privacy.type": "contacts",
                user: { $ne: currentUserId } // Others who share with contacts
            },
            {
                "privacy.type": { $exists: false },
                user: { $ne: currentUserId }
            },
            {
                "privacy.type": null,
                user: { $ne: currentUserId }
            },
            {
                "privacy.type": "except",
                "privacy.excludedList": { $nin: [currentUserId] }
            },
            {
                "privacy.type": "only",
                "privacy.allowedList": { $in: [currentUserId] }
            }
        ]
    })
        .populate("user", "name profilePic")
        .populate("viewedBy", "name profilePic")
        .sort({ createdAt: 1 }); // Chronological order for sequential viewing

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

// @description     Update Status Privacy Settings
// @route           PUT /api/status/privacy
// @access          Protected
const updateStatusPrivacy = asyncHandler(async (req, res) => {
    const { type, excludedUsers, includedUsers } = req.body;
    const user = await User.findById(req.user._id);

    if (!user.statusPrivacy) {
        user.statusPrivacy = { type: 'contacts', excludedUsers: [], includedUsers: [] };
    }

    if (type) user.statusPrivacy.type = type;
    if (excludedUsers) user.statusPrivacy.excludedUsers = excludedUsers;
    if (includedUsers) user.statusPrivacy.includedUsers = includedUsers;

    await user.save();
    res.json(user.statusPrivacy);
});

// @description     Get Status Privacy Settings
// @route           GET /api/status/privacy
// @access          Protected
const getStatusPrivacy = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id)
        .populate("statusPrivacy.excludedUsers", "name profilePic")
        .populate("statusPrivacy.includedUsers", "name profilePic");

    res.json(user.statusPrivacy);
});


module.exports = { createStatus, getStatuses, viewStatus, updateStatusPrivacy, getStatusPrivacy };
