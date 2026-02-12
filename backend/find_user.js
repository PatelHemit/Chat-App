require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const findUser = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const user = await User.findById("697a0403862d2253f71c1d12");
        if (user) {
            console.log(`User ID 697a0403862d2253f71c1d12 is: ${user.name} (${user.phone})`);
        } else {
            console.log("User not found");
        }
        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
};

findUser();
