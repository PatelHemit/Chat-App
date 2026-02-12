require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Chat = require('./models/Chat');

const checkHemitChats = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const hemitId = "69774857485a231537194d64";

        const user = await User.findById(hemitId);
        const chats = await Chat.find({ users: { $elemMatch: { $eq: hemitId } } })
            .populate("users", "name phone")
            .populate("latestMessage");

        console.log(`--- Chat Check for ${user?.name || 'Hemit'} ---`);
        console.log(`User exists: ${!!user}`);
        console.log(`Number of Chats found: ${chats.length}`);
        chats.forEach((chat, i) => {
            console.log(`Chat ${i + 1}: ${chat.chatName || 'Unnamed'} (ID: ${chat._id})`);
            console.log(`  Is Group: ${chat.isGroupChat}`);
            console.log(`  Users: ${chat.users.map(u => u.name).join(', ')}`);
            console.log(`  Latest Message: ${chat.latestMessage ? chat.latestMessage.content : 'None'}`);
        });

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
};

checkHemitChats();
