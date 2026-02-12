require('dotenv').config();
const mongoose = require('mongoose');
const Chat = require('./models/Chat');

const testQuery = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const hemitId = "69774857485a231537194d64";

        console.log("--- Testing Queries ---");

        // Test 1: Standard find (string)
        const res1 = await Chat.find({ users: hemitId });
        console.log(`Query { users: hemitId (string) }: Found ${res1.length}`);

        // Test 2: Standard find (ObjectId)
        const res2 = await Chat.find({ users: new mongoose.Types.ObjectId(hemitId) });
        console.log(`Query { users: hemitId (ObjectId) }: Found ${res2.length}`);

        // Test 3: ElemMatch (string)
        const res3 = await Chat.find({ users: { $elemMatch: { $eq: hemitId } } });
        console.log(`Query { users: { $elemMatch: { $eq: hemitId (string) } } }: Found ${res3.length}`);

        // Test 4: ElemMatch (ObjectId)
        const res4 = await Chat.find({ users: { $elemMatch: { $eq: new mongoose.Types.ObjectId(hemitId) } } });
        console.log(`Query { users: { $elemMatch: { $eq: hemitId (ObjectId) } } }: Found ${res4.length}`);

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
};

testQuery();
