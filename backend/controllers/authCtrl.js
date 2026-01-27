const asyncHandler = require("express-async-handler");
const User = require("../models/User");
const generateToken = require("../config/generateToken");

// Mock OTP Storage (In production use Redis/Database)
// defined outside handler to persist in memory while server runs
const otpStore = {};

// @description     Send OTP to phone number
// @route           POST /api/auth/send-otp
// @access          Public
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

    console.log(`[OTP] Generated OTP ${otp} for ${phone}`);

    // Twilio Configuration
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const client = require('twilio')(accountSid, authToken);
    const fromPhone = process.env.TWILIO_PHONE_NUMBER;

    try {
        if (!fromPhone || fromPhone === 'YOUR_TWILIO_PHONE_NUMBER') {
            console.warn("Twilio Phone Number not configured. Skipping SMS.");
            // For testing without Twilio number, we still return success but maybe log it
            res.json({ success: true, message: "OTP generated (Twilio skipped)", otp: otp }); // Return otp for dev convenience
            return;
        }

        const message = await client.messages.create({
            body: `Your verification code is: ${otp}`,
            from: fromPhone,
            to: phone
        });

        console.log(`[Twilio] Message sent: ${message.sid}`);
        res.json({ success: true, message: "OTP sent successfully" });

    } catch (error) {
        console.error("[Twilio Error] Failed to send SMS:", error.message);

        // FALLBACK: If Twilio fails, we still want to allow development/testing.
        // We return the OTP in the response body so the app can use it.
        res.json({
            success: true,
            message: `OTP generated (Twilio failed: ${error.message})`,
            otp: otp
        });
    }
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

    // Check if OTP matches
    if (otpStore[phone] && otpStore[phone] === otp) {
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
        throw new Error("Invalid OTP or Expired");
    }
});

module.exports = { sendOTP, verifyOTP };
