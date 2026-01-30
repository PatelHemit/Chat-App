require('dotenv').config();
const fs = require('fs');
const path = require('path');

const apiKey = process.env.GEMINI_API_KEY;
console.log("--- NODE PROCESS VIEW ---");
console.log("Key:", JSON.stringify(apiKey));
console.log("Length:", apiKey ? apiKey.length : "N/A");
if (apiKey) {
    for (let i = 0; i < apiKey.length; i++) {
        console.log(`Index ${i}: code=${apiKey.charCodeAt(i)} char='${apiKey[i]}'`);
    }
}

console.log("\n--- RAW FILE VIEW ---");
try {
    const envPath = path.join(__dirname, '.env');
    const buffer = fs.readFileSync(envPath);
    console.log("File buffer (hex):", buffer.toString('hex'));
    console.log("File content (dec):", Array.from(buffer).join(' '));
} catch (e) {
    console.error("Could not read .env file:", e.message);
}
