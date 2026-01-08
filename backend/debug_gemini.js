require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs');

const apiKey = process.env.GEMINI_API_KEY;

let logOutput = "";
function log(msg) {
    console.log(msg);
    logOutput += msg + "\n";
}

if (!apiKey) {
    log("❌ ERROR: GEMINI_API_KEY is missing in .env");
    fs.writeFileSync('debug_output_models.txt', logOutput);
    process.exit(1);
}

log(`Key Check: Length=${apiKey.length}`);
log(`StartsWith: ${apiKey.substring(0, 4)}...`);
log(`EndsWith: ...${apiKey.substring(apiKey.length - 5)}`);

// Use the API to LIST models
async function listModels() {
    log("\nFetching model list...");
    try {
        // We have to use the direct API style or the SDK's model manager
        // In @google/generative-ai v0.1+, usually unrelated to the main client instance
        // but let's try a direct fetch to the API endpoint if SDK version is elusive, 
        // OR try to guess the implementation. 
        // Actually, let's keep it simple: The error said "Call ListModels".

        // Using a raw fetch to ensure we see exactly what Google returns
        // because sometimes the SDK abstracts errors.
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.error) {
            log(`❌ API Error: ${JSON.stringify(data.error, null, 2)}`);
        } else if (data.models) {
            log("✅ MODELS FOUND:");
            data.models.forEach(m => {
                if (m.supportedGenerationMethods && m.supportedGenerationMethods.includes("generateContent")) {
                    log(`   - ${m.name} (${m.displayName})`);
                }
            });
        } else {
            log("⚠️ No models returned (but no error). Data: " + JSON.stringify(data));
        }

    } catch (error) {
        log(`❌ Network/Script Error: ${error.message}`);
    }

    fs.writeFileSync('debug_output_models.txt', logOutput);
}

listModels();
