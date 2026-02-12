require('dotenv').config();
const mongoose = require('mongoose');
const Chat = require('./models/Chat');

const checkChat = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const chat = await Chat.findById("697c51c06af4b42a6d2e02ce").populate("users", "name phone");
        if (chat) {
            console.log(`Chat: ${chat.chatName}`);
            console.log(`Users: ${JSON.stringify(chat.users)}`);
        } else {
            console.log("Chat not found");
        }
        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
};

checkChat();
