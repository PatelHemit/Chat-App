require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

async function verifyFix() {
    const rawKey = process.env.GEMINI_API_KEY;
    if (!rawKey) {
        console.error("GEMINI_API_KEY not found in .env");
        return;
    }

    const apiKey = rawKey.trim().replace(/[^\x00-\x7F]/g, "");

    console.log("Original Key Length:", rawKey.length);
    console.log("Sanitised Key Length:", apiKey.length);

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        // Using gemini-1.5-flash as it's the standard non-experimental model
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        console.log("Sending request to Gemini...");
        const result = await model.generateContent("Hi");
        const text = result.response.text();
        console.log("Gemini Response:", text);
        console.log("✅ VERIFICATION SUCCESS");
    } catch (error) {
        console.error("❌ VERIFICATION FAILED:", error);
        if (error.response) {
            console.error("Error Response Data:", error.response.data);
        }
    }
}

verifyFix();
