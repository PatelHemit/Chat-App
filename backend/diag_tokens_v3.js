const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');

const checkTokens = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || "mongodb+srv://hemitpatel550:oY4V8s37229N195T@cluster0.z5i6k.mongodb.net/chat-app?retryWrites=true&w=majority");
        console.log("--- Token Diagnostic ---");
        const users = await User.find({}, 'name phone pushTokens fcmTokens');

        users.forEach(u => {
            console.log(`User: ${u.name || u.phone}`);
            console.log(`  - Expo Tokens: ${u.pushTokens?.length || 0}`);
            if (u.pushTokens?.length > 0) {
                u.pushTokens.forEach((t, i) => console.log(`      [${i}] ${t}`));
            }
            console.log(`  - FCM Tokens: ${u.fcmTokens?.length || 0}`);
            if (u.fcmTokens?.length > 0) {
                u.fcmTokens.forEach((t, i) => console.log(`      [${i}] ${t.substring(0, 20)}...`));
            }
            console.log("------------------------");
        });

        process.exit(0);
    } catch (err) {
        console.error("Error:", err);
        process.exit(1);
    }
}

checkTokens();
