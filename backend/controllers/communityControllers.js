const asyncHandler = require("express-async-handler");
const Community = require("../models/Community");
const Chat = require("../models/Chat");
const Message = require("../models/Message");

// @description     Create New Community
// @route           POST /api/community
// @access          Protected
const createCommunity = asyncHandler(async (req, res) => {
    const { name, description, profilePic } = req.body;

    if (!name) {
        res.status(400);
        throw new Error("Community name is required");
    }

    // 1. Create the Community
    const newCommunity = await Community.create({
        name,
        description,
        profilePic,
        admin: req.user._id,
        users: [req.user._id]
    });

    // 2. Automatically create an Announcement Group for this community
    const announcementGroup = await Chat.create({
        chatName: `${name} Announcements`,
        isGroupChat: true,
        isAnnouncementGroup: true,
        users: [req.user._id],
        groupAdmin: req.user._id,
        groupPic: profilePic || undefined
    });

    // 3. Link the announcement group to the community
    newCommunity.announcementGroup = announcementGroup._id;
    await newCommunity.save();

    // 4. Send a Welcome Message to the Announcement Group
    await Message.create({
        sender: req.user._id,
        content: `Welcome to the ${name} community! This is the announcement group where admins can post updates.`,
        chat: announcementGroup._id,
        type: "text"
    });

    const fullCommunity = await Community.findById(newCommunity._id)
        .populate("admin", "-password")
        .populate("users", "-password")
        .populate("announcementGroup")
        .populate("groups");

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
        .populate("groups")
        .populate("announcementGroup")
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

const removeGroupFromCommunity = asyncHandler(async (req, res) => {
    const { communityId, groupId } = req.body;

    const community = await Community.findById(communityId);
    if (!community) {
        res.status(404);
        throw new Error("Community not found");
    }

    if (community.admin.toString() !== req.user._id.toString()) {
        res.status(401);
        throw new Error("Only Admin can remove groups");
    }

    const updatedCommunity = await Community.findByIdAndUpdate(
        communityId,
        { $pull: { groups: groupId } },
        { new: true }
    ).populate("groups").populate("announcementGroup");

    res.json(updatedCommunity);
});

// @description     Join Community
// @route           POST /api/community/join
// @access          Protected
const joinCommunity = asyncHandler(async (req, res) => {
    const { communityId } = req.body;

    const community = await Community.findById(communityId);
    if (!community) {
        res.status(404);
        throw new Error("Community not found");
    }

    // Add user to community and his announcement group
    const updatedCommunity = await Community.findByIdAndUpdate(
        communityId,
        { $addToSet: { users: req.user._id } },
        { new: true }
    ).populate("announcementGroup");

    if (updatedCommunity.announcementGroup) {
        await Chat.findByIdAndUpdate(
            updatedCommunity.announcementGroup._id,
            { $addToSet: { users: req.user._id } }
        );
    }

    res.json(updatedCommunity);
});

// @description     Leave Community
// @route           POST /api/community/leave
// @access          Protected
const leaveCommunity = asyncHandler(async (req, res) => {
    const { communityId } = req.body;

    const community = await Community.findById(communityId);
    if (!community) {
        res.status(404);
        throw new Error("Community not found");
    }

    // If user is admin, he cannot leave easily (logic can be complex, skipping for now)

    const updatedCommunity = await Community.findByIdAndUpdate(
        communityId,
        { $pull: { users: req.user._id } },
        { new: true }
    ).populate("announcementGroup");

    if (updatedCommunity.announcementGroup) {
        await Chat.findByIdAndUpdate(
            updatedCommunity.announcementGroup._id,
            { $pull: { users: req.user._id } }
        );
    }

    res.json({ message: "Left community successfully" });
});

const getCommunityById = asyncHandler(async (req, res) => {
    const community = await Community.findById(req.params.id)
        .populate("admin", "name profilePic phone")
        .populate("users", "name profilePic phone")
        .populate("groups")
        .populate("announcementGroup");

    if (!community) {
        res.status(404);
        throw new Error("Community not found");
    }

    res.json(community);
});

// @description     Add multiple members to Community
// @route           PUT /api/community/:id/add-members
// @access          Protected
const addMembersToCommunity = asyncHandler(async (req, res) => {
    const { users } = req.body; // Array of user IDs
    const communityId = req.params.id;

    const community = await Community.findById(communityId);

    if (!community) {
        res.status(404);
        throw new Error("Community not found");
    }

    if (community.admin.toString() !== req.user._id.toString()) {
        res.status(401);
        throw new Error("Only Admin can add members");
    }

    // Add to Community Users
    const updatedCommunity = await Community.findByIdAndUpdate(
        communityId,
        { $addToSet: { users: { $each: users } } },
        { new: true }
    ).populate("announcementGroup");

    // Add to Announcement Group
    if (updatedCommunity.announcementGroup) {
        await Chat.findByIdAndUpdate(
            updatedCommunity.announcementGroup._id,
            { $addToSet: { users: { $each: users } } }
        );
    }

    res.json(updatedCommunity);
});

// @description     Get groups available to be added to a community (User is admin & not already added)
// @route           GET /api/community/:id/available-groups
// @access          Protected
const getAvailableGroups = asyncHandler(async (req, res) => {
    const communityId = req.params.id;

    // 1. Get the community to see which groups are already there
    const community = await Community.findById(communityId);
    if (!community) {
        res.status(404);
        throw new Error("Community not found");
    }

    // 2. Find all groups where the current user is an admin
    // And exclude announcement groups or community chats
    const myGroups = await Chat.find({
        isGroupChat: true,
        groupAdmin: req.user._id,
        isAnnouncementGroup: { $ne: true }
    });

    // 3. Filter out groups that are already in this community
    // Convert ObjectIds to strings for comparison
    const existingGroupIds = community.groups.map(id => id.toString());

    const availableGroups = myGroups.filter(
        group => !existingGroupIds.includes(group._id.toString())
    );

    res.json(availableGroups);
});

// @description     Update Community Profile Picture
// @route           PUT /api/community/:id/profile-pic
// @access          Protected
const updateCommunityProfilePic = asyncHandler(async (req, res) => {
    const { profilePic } = req.body;
    const communityId = req.params.id;

    const community = await Community.findById(communityId);

    if (!community) {
        res.status(404);
        throw new Error("Community not found");
    }

    // Check if user is admin
    if (community.admin.toString() !== req.user._id.toString()) {
        res.status(401);
        throw new Error("Only Admin can update profile picture");
    }

    const updatedCommunity = await Community.findByIdAndUpdate(
        communityId,
        { profilePic },
        { new: true }
    );

    // Also update the announcement group picture if it exists
    if (community.announcementGroup) {
        await Chat.findByIdAndUpdate(
            community.announcementGroup,
            { groupPic: profilePic }
        );
    }

    res.json(updatedCommunity);
});

module.exports = {
    createCommunity,
    getCommunities,
    getCommunityById,
    addGroupToCommunity,
    removeGroupFromCommunity,
    joinCommunity,
    leaveCommunity,
    addMembersToCommunity,
    getAvailableGroups,
    updateCommunityProfilePic
};
