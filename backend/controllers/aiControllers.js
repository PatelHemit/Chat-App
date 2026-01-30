const { GoogleGenerativeAI } = require("@google/generative-ai");
const AiMessage = require("../models/AiMessage");

// Helper to access Gemini
const getGeminiResponse = async (prompt) => {
    try {
        const rawKey = process.env.GEMINI_API_KEY;
        if (!rawKey) throw new Error("GEMINI_API_KEY not found in .env");

        // Sanitise key: remove whitespace and any non-ASCII characters (like Unicode 257)
        const apiKey = rawKey.trim().replace(/[^\x00-\x7F]/g, "");

        const genAI = new GoogleGenerativeAI(apiKey);

        // Try Experimental model (usually has free quota)
        try {
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
        return `Error: ${error.message}`;
    }
};

// @description     Get AI Response & Save History
// @route           POST /api/ai/chat
// @access          Protected
const chatWithAI = async (req, res) => {
    const { prompt, type, duration } = req.body;

    if (!prompt && type !== 'audio') {
        return res.status(400).json({ error: "Prompt or audio is required" });
    }

    try {
        const userId = req.user._id;

        // 1. Save User Message
        const userMsg = await AiMessage.create({
            user: userId,
            sender: "user",
            content: prompt,
            type: type || "text",
            duration: duration
        });

        // 2. Get AI Response
        let metaPrompt;
        if (type === 'audio') {
            metaPrompt = `You are Meta AI, an intelligent assistant built by Meta. I received a voice message from the user. Since I cannot hear it yet, please acknowledge that you received a voice note and ask them if they can type it or let them know you'll be able to hear it in a future update. User sent a voice note.`;
        } else {
            metaPrompt = `You are Meta AI, an intelligent assistant built by Meta. You are helpful, friendly, and concise. User: ${prompt}`;
        }

        const reply = await getGeminiResponse(metaPrompt);

        // 3. Save AI Response
        const aiMsg = await AiMessage.create({
            user: userId,
            sender: "ai",
            content: reply
        });

        res.json({ reply, userMessage: userMsg, aiMessage: aiMsg });

    } catch (error) {
        console.error("ChatWithAI Error:", error);
        res.status(500).json({ error: error.message });
    }
};

// @description     Get AI Chat History
// @route           GET /api/ai/history
// @access          Protected
const getAiHistory = async (req, res) => {
    try {
        const userId = req.user._id;

        // Fetch messages for this user, sorted by creation time
        const messages = await AiMessage.find({ user: userId })
            .sort({ createdAt: 1 });

        res.json(messages);
    } catch (error) {
        console.error("GetAiHistory Error:", error);
        res.status(500).json({ error: error.message });
    }
};

module.exports = { chatWithAI, getAiHistory };
