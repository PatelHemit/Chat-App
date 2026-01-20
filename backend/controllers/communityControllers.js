const asyncHandler = require("express-async-handler");
const Community = require("../models/Community");

// @description     Create New Community
// @route           POST /api/community
// @access          Protected
const createCommunity = asyncHandler(async (req, res) => {
    const { name, description, profilePic } = req.body;

    if (!name) {
        res.status(400);
        throw new Error("Community name is required");
    }

    const newCommunity = await Community.create({
        name,
        description,
        profilePic,
        admin: req.user._id,
        users: [req.user._id]
    });

    const fullCommunity = await Community.findById(newCommunity._id)
        .populate("admin", "-password")
        .populate("users", "-password");

    res.status(201).json(fullCommunity);
});

// @description     Get All Communities
// @route           GET /api/community
// @access          Protected
const getCommunities = asyncHandler(async (req, res) => {
    // Return communities where user is a member
    const communities = await Community.find({
        users: { $elemMatch: { $eq: req.user._id } }
    })
        .populate("admin", "name profilePic")
        .populate("groups") // Show groups inside
        .sort({ updatedAt: -1 });

    res.json(communities);
});

// @description     Add Group to Community
// @route           PUT /api/community/add-group
// @access          Protected
const addGroupToCommunity = asyncHandler(async (req, res) => {
    const { communityId, groupId } = req.body;

    const community = await Community.findById(communityId);

    if (!community) {
        res.status(404);
        throw new Error("Community not found");
    }

    // Check if user is admin
    if (community.admin.toString() !== req.user._id.toString()) {
        res.status(401);
        throw new Error("Only Admin can add groups");
    }

    const updatedCommunity = await Community.findByIdAndUpdate(
        communityId,
        { $addToSet: { groups: groupId } }, // Prevent duplicates
        { new: true }
    )
        .populate("groups");

    res.json(updatedCommunity);
});

module.exports = { createCommunity, getCommunities, addGroupToCommunity };
