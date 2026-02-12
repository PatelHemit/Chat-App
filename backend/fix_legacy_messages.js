
const mongoose = require('mongoose');
const Message = require('./models/Message');
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

const fixLegacyMessages = async () => {
    await connectDB();

    try {
        const messages = await Message.find({ type: { $ne: 'text' } });
        let updatedCount = 0;

        for (const msg of messages) {
            let needsSave = false;
            let newType = msg.type;
            let newContent = msg.content;

            // 1. Fix Type Mismatch (Document -> Image/Video)
            if (msg.type === 'document') {
                const lowerContent = msg.content.toLowerCase();
                if (lowerContent.endsWith('.jpg') || lowerContent.endsWith('.jpeg') || lowerContent.endsWith('.png')) {
                    newType = 'image';
                    needsSave = true;
                    console.log(`Fixing Type: ${msg._id} document -> image`);
                } else if (lowerContent.endsWith('.mp4') || lowerContent.endsWith('.mov')) {
                    newType = 'video';
                    needsSave = true;
                    console.log(`Fixing Type: ${msg._id} document -> video`);
                }
            }

            // 2. Fix Path Prefix (missing /uploads/)
            // Check if it's NOT an absolute URL (http) and NOT already starting with /uploads/
            if (!msg.content.startsWith('http') && !msg.content.startsWith('/uploads/')) {
                newContent = `/uploads/${msg.content}`;
                needsSave = true;
                console.log(`Fixing Path: ${msg._id} ${msg.content} -> ${newContent}`);
            }

            if (needsSave) {
                msg.type = newType;
                msg.content = newContent;
                await msg.save();
                updatedCount++;
            }
        }

        console.log(`Migration Complete. Updated ${updatedCount} messages.`);

    } catch (error) {
        console.error(error);
    } finally {
        mongoose.disconnect();
    }
};

fixLegacyMessages();
