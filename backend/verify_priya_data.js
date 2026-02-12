require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Chat = require('./models/Chat');
const Message = require('./models/Message');

const checkPriyaData = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const priyaId = "697a0403862d2253f71c1d12";

        const user = await User.findById(priyaId);
        const chatCount = await Chat.countDocuments({ users: priyaId });
        const messageCount = await Message.countDocuments({ sender: priyaId });

        console.log(`--- Data Check for ${user?.name || 'Priya'} ---`);
        console.log(`User exists: ${!!user}`);
        console.log(`Push Tokens: ${JSON.stringify(user?.pushTokens || [])}`);
        console.log(`Number of Chats: ${chatCount}`);
        console.log(`Number of Messages Sent: ${messageCount}`);

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
};

checkPriyaData();
