require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const checkPriya = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const user = await User.findById("697a0403862d2253f71c1d12");
        if (user) {
            console.log(`User: ${user.name}`);
            console.log(`Tokens: ${JSON.stringify(user.pushTokens)}`);
        } else {
            console.log("Priya not found");
        }
        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
};

checkPriya();
