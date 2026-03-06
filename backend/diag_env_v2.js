require('dotenv').config();
console.log("Loaded Env Vars Count:", Object.keys(process.env).filter(k => k.startsWith('IMAGEKIT') || k.startsWith('LIVEKIT') || k === 'MONGO_URI').length);
console.log("IMAGEKIT_PUBLIC_KEY:", process.env.IMAGEKIT_PUBLIC_KEY ? "EXISTS" : "MISSING");
console.log("IMAGEKIT_PRIVATE_KEY:", process.env.IMAGEKIT_PRIVATE_KEY ? "EXISTS" : "MISSING");
console.log("IMAGEKIT_URL_ENDPOINT:", process.env.IMAGEKIT_URL_ENDPOINT ? "EXISTS" : "MISSING");
console.log("MONGO_URI:", process.env.MONGO_URI ? "EXISTS" : "MISSING");
console.log("GEMINI_API_KEY:", process.env.GEMINI_API_KEY ? "EXISTS" : "MISSING");
console.log("TWILIO_ACCOUNT_SID:", process.env.TWILIO_ACCOUNT_SID ? "EXISTS" : "MISSING");
console.log("Keys starting with IMAGEKIT:", Object.keys(process.env).filter(k => k.startsWith('IMAGEKIT')));
