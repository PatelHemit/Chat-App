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
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/chat-app';
    console.log('Connecting to:', mongoUri);
    await mongoose.connect(mongoUri);
    
    const users = await User.find({}, 'name fcmTokens pushTokens');
    console.log('Found users:', users.length);
    users.forEach(u => {
      console.log(`User: ${u.name}`);
      console.log(`  FCM Tokens: ${u.fcmTokens?.length || 0}`);
      console.log(`  Push Tokens: ${u.pushTokens?.length || 0}`);
    });
    
    mongoose.connection.close();
  } catch (err) {
    console.error('Error:', err);
  }
}

checkUsers();
