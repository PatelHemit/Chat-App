const { GoogleGenerativeAI } = require("@google/generative-ai");

// Helper to access Gemini
const getGeminiResponse = async (prompt) => {
    try {
        const apiKey = process.env.GEMINI_API_KEY || "AIzaSyDbs9NEwV6z33jhE4v9ujd4zYGQFAnq_9M";
        if (!apiKey) throw new Error("GEMINI_API_KEY not found in .env");

        const genAI = new GoogleGenerativeAI(apiKey);

        // Try latest model first
        try {
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            const result = await model.generateContent(prompt);
            return result.response.text();
        } catch (e) {
            console.log("Gemini 1.5 Flash failed, trying Pro...", e.message);
            // Fallback
            const model = genAI.getGenerativeModel({ model: "gemini-pro" });
            const result = await model.generateContent(prompt);
            return result.response.text();
        }
    } catch (error) {
        console.error("Gemini Error:", error);
        return "I am having connection issues with Google AI. Please try again later.";
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
