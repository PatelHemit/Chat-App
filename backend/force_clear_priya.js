require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const clearAllPriya = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const result = await User.findByIdAndUpdate("697a0403862d2253f71c1d12", {
            $set: { pushTokens: [] }
        }, { new: true });
        console.log(`Priya tokens cleared: ${JSON.stringify(result.pushTokens)}`);
        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
};

clearAllPriya();
