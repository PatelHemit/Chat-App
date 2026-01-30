const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
const content = fs.readFileSync(envPath, 'utf8');

// Use regex to find and clean GEMINI_API_KEY
const lines = content.split('\n');
const newLines = lines.map(line => {
    if (line.startsWith('GEMINI_API_KEY=')) {
        const val = line.split('=')[1];
        // Clean non-ASCII and trim
        const cleaned = val.trim().replace(/[^\x00-\x7F]/g, "");
        console.log(`Cleaning GEMINI_API_KEY: length ${val.length} -> ${cleaned.length}`);
        return `GEMINI_API_KEY=${cleaned}`;
    }
    return line;
});

fs.writeFileSync(envPath, newLines.join('\n'));
console.log("✅ .env file cleaned and saved.");
