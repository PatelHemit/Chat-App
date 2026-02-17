const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

const checkTokens = async () => {
    try {
        const uri = process.env.MONGO_URI || "mongodb://localhost:27017/chat-app";
        console.log("Connecting to:", uri.includes("@") ? "Remote Cluster" : uri);
        await mongoose.connect(uri);
        console.log("Connected to MongoDB");

        const users = await User.find({}, "name phone pushTokens");
        console.log("\n--- User Push Tokens ---");
        users.forEach(u => {
            console.log(`User: ${u.name || u.phone}`);
            console.log(`Tokens count: ${u.pushTokens ? u.pushTokens.length : 0}`);
            if (u.pushTokens && u.pushTokens.length > 0) {
                u.pushTokens.forEach((t, i) => console.log(`  [${i}] ${t.substring(0, 20)}...`));
            }
            console.log("------------------------");
        });

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
};

checkTokens();
