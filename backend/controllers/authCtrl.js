const asyncHandler = require("express-async-handler");
const User = require("../models/User");
const generateToken = require("../config/generateToken");

// Mock OTP Storage (In production use Redis/Database)
// defined outside handler to persist in memory while server runs
const otpStore = {};

// @description     Send OTP to phone number
// @route           POST /api/auth/send-otp
// @access          Public
const sendOTP = asyncHandler(async (req, res) => {
    const { phone } = req.body;
    if (!phone) {
        res.status(400);
        throw new Error("Phone number is required");
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore[phone] = otp;

    console.log(`[OTP] Sending OTP ${otp} to ${phone}`);

    // Return OTP in response for testing purposes (Simulating SMS delivery)
    res.json({ success: true, message: "OTP sent successfully", otp: otp });
});

// @description     Verify OTP and Login/Register
// @route           POST /api/auth/verify-otp
// @access          Public
const verifyOTP = asyncHandler(async (req, res) => {
    const { phone, otp } = req.body;
    if (!phone || !otp) {
        res.status(400);
        throw new Error("Phone and OTP are required");
    }

    if (otpStore[phone] === otp) {
        delete otpStore[phone]; // Clear OTP after success

        // Find or Create User
        let user = await User.findOne({ phone });

        if (!user) {
            user = await User.create({ phone });
            console.log(`[DB] New User Created: ${phone}`);
        } else {
            console.log(`[DB] User Found: ${phone}`);
        }

        res.json({
            success: true,
            message: "OTP verified",
            user: user,
            token: generateToken(user._id)
        });
    } else {
        res.status(400);
        throw new Error("Invalid OTP");
    }
});

module.exports = { sendOTP, verifyOTP };
