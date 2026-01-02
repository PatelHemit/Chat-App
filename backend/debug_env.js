const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
console.log("--- RAW FILE CONTENT ---");
console.log(fs.readFileSync(envPath, 'utf8'));
console.log("------------------------");

const result = dotenv.config();
if (result.error) {
    console.log("Dotenv Error:", result.error);
}

console.log("--- PARSED ENV ---");
console.log("GEMINI_API_KEY:", process.env.GEMINI_API_KEY);
console.log("ALL KEYS:", Object.keys(process.env).filter(k => !k.startsWith('npm_')));
