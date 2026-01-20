const mongoose = require('mongoose');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const User = require('./models/User');
const Chat = require('./models/Chat');
const Status = require('./models/Status');
const Call = require('./models/Call');
const Community = require('./models/Community');

dotenv.config();
connectDB();

const seedFeatures = async () => {
    try {
        console.log("🌱 Starting Seed Process...");

        // 1. Get a Primary User (or create one)
        let mainUser = await User.findOne({ phone: "9876543210" });
        if (!mainUser) {
            mainUser = await User.create({
                name: "Test User",
                phone: "9876543210",
                about: "I am a test user",
                profilePic: "https://i.pravatar.cc/150?u=test"
            });
            console.log("Created Main User");
        }

        // 2. Get a Secondary User (for calls/groups)
        let otherUser = await User.findOne({ phone: "1234567890" });
        if (!otherUser) {
            otherUser = await User.create({
                name: "Alice Friend",
                phone: "1234567890",
                about: "Hey there!",
                profilePic: "https://i.pravatar.cc/150?u=alice"
            });
            console.log("Created Secondary User (Alice)");
        }

        // --- SEED STATUSES ---
        console.log("...Seeding Statuses");
        await Status.deleteMany({}); // Clear old
        await Status.create([
            {
                user: mainUser._id,
                mediaUrl: "https://images.pexels.com/photos/1366919/pexels-photo-1366919.jpeg",
                mediaType: "image",
                caption: "Beautiful mountains! 🏔️"
            },
            {
                user: otherUser._id,
                mediaUrl: "https://images.pexels.com/photos/1108099/pexels-photo-1108099.jpeg",
                mediaType: "image",
                caption: "Puppy love 🐶"
            }
        ]);

        // --- SEED CALLS ---
        console.log("...Seeding Call Logs");
        await Call.deleteMany({});
        await Call.create([
            {
                caller: otherUser._id,
                receiver: mainUser._id,
                type: "audio",
                status: "missed",
                duration: 0
            },
            {
                caller: mainUser._id,
                receiver: otherUser._id,
                type: "video",
                status: "answered",
                duration: 125 // seconds
            }
        ]);

        // --- SEED COMMUNITY ---
        console.log("...Seeding Community");
        await Community.deleteMany({});
        await Community.create({
            name: "Tech Enthusiasts",
            description: "A community for tech lovers.",
            profilePic: "https://images.pexels.com/photos/3183150/pexels-photo-3183150.jpeg",
            admin: mainUser._id,
            users: [mainUser._id, otherUser._id]
        });

        console.log("✅ Seed Completed Successfully!");
        console.log(" - Added 2 Statuses");
        console.log(" - Added 2 Calls");
        console.log(" - Added 1 Community");

        process.exit();
    } catch (error) {
        console.error("❌ Seed Error:", error);
        process.exit(1);
    }
};

seedFeatures();
