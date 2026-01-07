const asyncHandler = require("express-async-handler");
const User = require("../models/User");

// @description     Get or Search all users
// @route           GET /api/user?search=
// @access          Protected
const allUsers = asyncHandler(async (req, res) => {
    const keyword = req.query.search
        ? {
            $or: [
                { name: { $regex: req.query.search, $options: "i" } },
                { phone: { $regex: req.query.search, $options: "i" } },
            ],
        }
        : {};

    const users = await User.find(keyword).find({ _id: { $ne: req.user._id } });
    res.send(users);
});

// @description     Update User Profile
// @route           POST /api/user/update-profile
// @access          Public
const updateProfile = asyncHandler(async (req, res) => {
    const { phone, name, about, profilePic } = req.body;
    if (!phone) {
        res.status(400);
        throw new Error("Phone is required to update profile");
    }

    const user = await User.findOneAndUpdate(
        { phone },
        { name, about, profilePic },
        { new: true } // Return updated document
    );

    if (!user) {
        res.status(404);
        throw new Error("User not found");
    }

    res.json({ success: true, user });
});

module.exports = { allUsers, updateProfile };
