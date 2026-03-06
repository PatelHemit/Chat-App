const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

const diag = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const users = await User.find({ name: { $in: ['Hemit', 'Shilpa ben', 'Priya'] } });

        console.log('--- User Diagnostic ---');
        users.forEach(u => {
            console.log(`User: ${u.name} (${u._id})`);
            console.log(`- Push Tokens (Expo): ${u.pushTokens?.length || 0}`);
            console.log(`- FCM Tokens (Native): ${u.fcmTokens?.length || 0}`);
            if (u.fcmTokens?.length > 0) {
                console.log(`  Last FCM: ${u.fcmTokens[u.fcmTokens.length - 1].substring(0, 20)}...`);
            }
        });

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

diag();
