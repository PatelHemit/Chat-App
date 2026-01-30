require('dotenv').config();

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
    console.error("GEMINI_API_KEY NOT FOUND");
    process.exit(1);
}

console.log("API Key length:", apiKey.length);
console.log("API Key characters (escaped):", JSON.stringify(apiKey));

for (let i = 0; i < apiKey.length; i++) {
    const charCode = apiKey.charCodeAt(i);
    console.log(`Index ${i}: char='${apiKey[i]}', code=${charCode}`);
}

if (apiKey.length > 39) {
    console.warn("WARNING: API Key is longer than usual (39 chars).");
}
