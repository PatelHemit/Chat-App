require('dotenv').config();
const mongoose = require('dotenv').config();
const mongoose_actual = require('mongoose');
const User = require('./models/User');

const checkHemit = async () => {
    try {
        await mongoose_actual.connect(process.env.MONGO_URI);
        const user = await User.findById("69774857485a231537194d64");
        if (user) {
            console.log(`User: ${user.name}`);
            console.log(`Tokens: ${JSON.stringify(user.pushTokens)}`);
        } else {
            console.log("Hemit not found");
        }
        await mongoose_actual.disconnect();
    } catch (err) {
        console.error(err);
    }
};

checkHemit();
