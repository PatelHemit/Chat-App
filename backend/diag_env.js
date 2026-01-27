require('dotenv').config();
console.log('PORT:', process.env.PORT);
console.log('TWILIO_ACCOUNT_SID:', process.env.TWILIO_ACCOUNT_SID ? 'Loaded (starts with ' + process.env.TWILIO_ACCOUNT_SID.substring(0, 5) + ')' : 'NOT LOADED');
console.log('TWILIO_AUTH_TOKEN:', process.env.TWILIO_AUTH_TOKEN ? 'Loaded' : 'NOT LOADED');
console.log('TWILIO_PHONE_NUMBER:', process.env.TWILIO_PHONE_NUMBER);

try {
    const twilio = require('twilio');
    const client = new twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    console.log('Twilio Client initialized successfully');
} catch (e) {
    console.error('Twilio Initialization Error:', e.message);
}
