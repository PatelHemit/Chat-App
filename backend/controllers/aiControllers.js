const { GoogleGenerativeAI } = require("@google/generative-ai");

// Helper to access Gemini
const getGeminiResponse = async (prompt) => {
    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) throw new Error("GEMINI_API_KEY not found in .env");

        const genAI = new GoogleGenerativeAI(apiKey);

        // Try Experimental model (usually has free quota)
        try {
            // Updated to use the Experimental version which is listed in your account
            const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
            const result = await model.generateContent(prompt);
            return result.response.text();
        } catch (e) {
            console.log("Gemini Exp failed, trying Flash Latest...", e.message);
            // Fallback to the generic alias
            const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
            const result = await model.generateContent(prompt);
            return result.response.text();
        }
    } catch (error) {
        console.error("Gemini Error:", error);
        // Return actual error for debugging
        return `Error: ${error.message}`;
    }
};

// @description     Get AI Response
// @route           POST /api/ai/chat
// @access          Protected
const chatWithAI = async (req, res) => {
    const { prompt } = req.body;

    if (!prompt) {
        return res.status(400).json({ error: "Prompt is required" });
    }

    // Simulate Meta AI persona
    const metaPrompt = `You are Meta AI, an intelligent assistant built by Meta. You are helpful, friendly, and concise. User: ${prompt}`;

    const reply = await getGeminiResponse(metaPrompt);
    res.json({ reply });
};

module.exports = { chatWithAI };
