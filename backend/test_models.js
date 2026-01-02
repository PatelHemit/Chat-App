const { GoogleGenerativeAI } = require("@google/generative-ai");

const listModels = async () => {
    try {
        const apiKey = "AIzaSyDbs9NEwV6z33jhE4v9ujd4zYGQFAnq_9M";
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        // We can't list models directly easily with the high level SDK helper sometimes, 
        // but let's try to just hit the API or use the model listing if available.
        // Actually the SDK has no direct listModels on the instance usually, it's on the class or manager.
        // Let's try to just run a simple generateContent on "gemini-1.5-flash" again in standalone script to isolate.

        console.log("Trying gemini-1.5-flash...");
        const result = await model.generateContent("Hello");
        console.log("Success with gemini-1.5-flash");
        console.log(result.response.text());

    } catch (e) {
        console.log("Error with gemini-1.5-flash:", e.message);

        try {
            console.log("Trying gemini-pro...");
            const genAI2 = new GoogleGenerativeAI("AIzaSyDbs9NEwV6z33jhE4v9ujd4zYGQFAnq_9M");
            const model2 = genAI2.getGenerativeModel({ model: "gemini-pro" });
            const result2 = await model2.generateContent("Hello");
            console.log("Success with gemini-pro");
        } catch (e2) {
            console.log("Error with gemini-pro:", e2.message);
        }
    }
};

listModels();
