require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const checkTokens = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to DB");

        const users = await User.find({}, 'name phone pushTokens');
        console.log("\n--- User Push Tokens ---");
        users.forEach(u => {
            console.log(`User: ${u.name || 'No Name'} (${u.phone}) [ID: ${u._id}]`);
            console.log(`Tokens: ${JSON.stringify(u.pushTokens)}`);
            console.log("------------------------");
        });

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
};

checkTokens();
