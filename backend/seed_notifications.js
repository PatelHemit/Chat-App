const mongoose = require('mongoose');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const User = require('./models/User');
const Notification = require('./models/Notification');

dotenv.config();
connectDB();

const seedNotifications = async () => {
    try {
        console.log("🌱 Starting Notification Seed...");

        // 1. Get Users
        let mainUser = await User.findOne({ phone: "9876543210" });
        let otherUser = await User.findOne({ phone: "1234567890" });

        if (!mainUser || !otherUser) {
            console.log("❌ Users not found. Run 'seed_features.js' first.");
            process.exit(1);
        }

        // 2. Create Notifications
        await Notification.deleteMany({}); // Clear old

        await Notification.create([
            {
                recipient: mainUser._id,
                sender: otherUser._id,
                type: "missed_call",
                content: "You missed a video call from Alice.",
                isRead: false
            },
            {
                recipient: mainUser._id,
                sender: otherUser._id,
                type: "group_add",
                content: "Alice added you to 'Weekend Trip Planning'.",
                isRead: true
            },
            {
                recipient: mainUser._id,
                type: "system_alert",
                content: "Welcome to WhatsApp! Secure your account with Two-Step Verification.",
                isRead: false
            }
        ]);

        console.log("✅ Notifications Seeded Successfully!");
        console.log(" - Added 3 Notifications for Main User");

        process.exit();
    } catch (error) {
        console.error("❌ Seed Error:", error);
        process.exit(1);
    }
};

seedNotifications();
