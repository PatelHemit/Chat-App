const { GoogleGenerativeAI } = require("@google/generative-ai");

async function testLogic() {
    // Simulate the bad key with character 257 at index 39
    const badKey = "AIzaSyDPwK4GuDj2Hs1QI97fbr6ymFCNHZtcSLw\u0101";
    console.log("Original Key Length:", badKey.length);
    console.log("Original index 39 code:", badKey.charCodeAt(39));

    // Sanitisation logic
    const sanitizedKey = badKey.trim().replace(/[^\x00-\x7F]/g, "");
    console.log("Sanitized Key Length:", sanitizedKey.length);

    if (sanitizedKey.length === 39) {
        console.log("✅ Sanitisation SUCCESS: Length is now 39.");
    } else {
        console.error("❌ Sanitisation FAILED: Length is", sanitizedKey.length);
    }

    try {
        const genAI = new GoogleGenerativeAI(sanitizedKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        // We won't actually call generateContent because we don't have a real key here,
        // but we want to see if the library initialization or a basic property access fails.
        console.log("Library initialized with sanitized key.");
    } catch (e) {
        console.error("Library initialization failed:", e.message);
    }
}

testLogic();
