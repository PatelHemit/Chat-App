const mongoose = require('mongoose');
require('dotenv').config({ path: 'd:/chat app/backend/.env' });
const User = require('./models/User');

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('--- USER DIAGNOSTIC ---');
        const users = await User.find({}, 'name phone fcmTokens pushTokens');
        users.forEach(u => {
            console.log(`${u._id} | ${u.name || 'N/A'} | ${u.phone} | FCM:${u.fcmTokens?.length || 0} | Push:${u.pushTokens?.length || 0}`);
        });
        console.log('-----------------------');
        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

run();
