const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');
const Chat = require('./models/Chat');
const Message = require('./models/Message');

async function check() {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to DB");

    // 1. Get the specific users
    const shilpa = await User.findOne({ phone: '+918238157261' });
    const priya = await User.findOne({ phone: '+917041607411' });

    if (!shilpa || !priya) {
        console.log(`User Check: Shilpa Found? ${!!shilpa}, Priya Found? ${!!priya}`);
        await mongoose.disconnect();
        return;
    }

    console.log(`Shilpa ID: ${shilpa._id}, Priya ID: ${priya._id}`);

    // 2. Find ANY chat involving both
    const chats = await Chat.find({
        users: { $all: [shilpa._id, priya._id] }
    }).populate("users", "name phone");

    console.log(`Found ${chats.length} chats between them.`);
    for (const c of chats) {
        const lastMsg = await Message.findOne({ chat: c._id }).sort({ createdAt: -1 });
        console.log(`- Chat ID: ${c._id}`);
        console.log(`  Users: ${c.users.map(u => `${u.name} (${u.phone})`).join(", ")}`);
        console.log(`  Latest Message: ${lastMsg ? lastMsg.content : 'none'}`);
        console.log(`  HiddenFor: ${c.hiddenFor}`);
    }

    // 3. Check if Shilpa has any OTHER "Priya" in her contacts or chat list
    const shilpaChats = await Chat.find({ users: shilpa._id }).populate("users", "name phone");
    console.log(`\nShilpa (${shilpa.phone}) has ${shilpaChats.length} total chats. Listing recipients:`);
    shilpaChats.forEach(c => {
        const others = c.users.filter(u => u._id.toString() !== shilpa._id.toString());
        console.log(` - Chat with: ${others.map(u => `${u.name} (${u.phone})`).join(", ")}`);
    });

    await mongoose.disconnect();
}

check();
