const mongoose = require('mongoose');
require('dotenv').config();

const UserSchema = new mongoose.Schema({
  name: String,
  fcmTokens: [String],
  pushTokens: [String]
}, { collection: 'users' });

const User = mongoose.model('User', UserSchema);

async function checkUsers() {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/chat-app';
    console.log('Connecting to:', mongoUri.substring(0, 20) + '...');
    await mongoose.connect(mongoUri);
    
    // Find all users with any tokens
    const users = await User.find({ 
      $or: [
        { fcmTokens: { $exists: true, $not: { $size: 0 } } },
        { pushTokens: { $exists: true, $not: { $size: 0 } } }
      ]
    }, 'name fcmTokens pushTokens');
    
    console.log(`Found ${users.length} users with tokens:`);
    users.forEach(u => {
      console.log(`- ${u.name}: FCM(${u.fcmTokens?.length || 0}), Push(${u.pushTokens?.length || 0})`);
      if (u.fcmTokens?.length > 0) {
        console.log(`  FCM sample: ${u.fcmTokens[0].substring(0, 20)}...`);
      }
    });
    
    mongoose.connection.close();
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

checkUsers();
