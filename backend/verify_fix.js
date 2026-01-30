require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

async function verifyFix() {
    const rawKey = process.env.GEMINI_API_KEY;
    if (!rawKey) {
        console.error("GEMINI_API_KEY not found in .env");
        return;
    }

    // Use the same sanitisation logic as in the fix
    const apiKey = rawKey.trim().replace(/[^\x00-\x7F]/g, "");

    console.log("Original Key Length:", rawKey.length);
    console.log("Sanitised Key Length:", apiKey.length);

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent("Verify connection: respond with 'OK'");
        console.log("RESULT:", result.response.text());
        console.log("✅ VERIFICATION SUCCESS: Gemini responded correctly.");
    } catch (error) {
        console.error("❌ VERIFICATION FAILED:", error.message);
    }
}

verifyFix();
