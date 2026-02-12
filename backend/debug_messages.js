
const mongoose = require('mongoose');
const Message = require('./models/Message');
const Chat = require('./models/Chat');
const User = require('./models/User');
const dotenv = require('dotenv');

dotenv.config();

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("MongoDB Connected");
    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
};

const debugMessages = async () => {
    await connectDB();

    const fs = require('fs');
    const path = require('path');

    // ... (previous code)

    try {
        // Fetch last 50 messages to secure some media ones
        const messages = await Message.find({ type: { $ne: 'text' } })
            .sort({ createdAt: -1 })
            .limit(20)
            .lean();

        const output = messages.map(msg => ({
            id: msg._id,
            type: msg.type,
            content: msg.content,
            fileName: msg.fileName
        }));

        fs.writeFileSync(path.join(__dirname, 'debug_output.txt'), JSON.stringify(output, null, 2));
        console.log("Debug output written to debug_output.txt");

    } catch (error) {
        console.error(error);
    } finally {
        mongoose.disconnect();
    }
};

debugMessages();
