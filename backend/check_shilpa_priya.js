const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');
const Chat = require('./models/Chat');
const Message = require('./models/Message');

async function check() {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to DB");

    const usersAll = await User.find({ name: { $regex: /shilpa|priya/i } }).select("name _id phone");
    console.log("MATCHING USERS IN DB:", usersAll.map(u => ({ name: u.name, _id: u._id, phone: u.phone })));

    for (const user of usersAll) {
        const chats = await Chat.find({ users: user._id }).populate("users", "name");
        console.log(`User ${user.name} (${user._id}) is in ${chats.length} chats.`);
        for (const c of chats) {
            const lastMsg = await Message.findOne({ chat: c._id }).sort({ createdAt: -1 });
            console.log(`  - Chat with: ${c.users.map(u => u.name).join(", ")} | LastMsg: ${lastMsg ? lastMsg.content : 'none'} @ ${lastMsg ? lastMsg.createdAt : ''}`);
        }
    }

    await mongoose.disconnect();
}

check();
