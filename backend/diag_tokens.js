const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const User = require('./models/User');

const checkTokens = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB");

        const users = await User.find({}, 'name phone pushTokens');
        console.log("\nRegistered Users and Tokens:");
        users.forEach(u => {
            console.log(`- ${u.name || u.phone}: ${u.pushTokens.length} tokens`);
            if (u.pushTokens.length > 0) {
                u.pushTokens.forEach(t => console.log(`  [${t}]`));
            }
        });

        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
};

checkTokens();
