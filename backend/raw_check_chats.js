require('dotenv').config();
const mongoose = require('mongoose');

const checkCount = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const hemitId = "69774857485a231537194d64";

        // Use raw collection access to avoid model issues if any
        const chats = await mongoose.connection.db.collection('chats').find({
            users: { $elemMatch: { $eq: new mongoose.Types.ObjectId(hemitId) } }
        }).toArray();

        console.log(`--- Raw Chat Count for Hemit ---`);
        console.log(`Chats found: ${chats.length}`);

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
};

checkCount();
