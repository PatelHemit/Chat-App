require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

const apiKey = process.env.GEMINI_API_KEY;

console.log("Key Length:", apiKey ? apiKey.length : "N/A");
if (apiKey) {
    let hex = "";
    for (let i = 0; i < apiKey.length; i++) {
        hex += apiKey.charCodeAt(i).toString(16).padStart(4, '0') + " ";
    }
    console.log("Hex Codes:", hex);

    // Test Gemini connection
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    model.generateContent("Hi")
        .then(res => {
            console.log("Gemini Test SUCCESS:", res.response.text());
        })
        .catch(err => {
            console.error("Gemini Test FAILED:", err.message);
        });
}
