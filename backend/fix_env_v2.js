const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
const targetKey = 'AIzaSyDbs9NEwV6z33jhE4v9ujd4zYGQFAnq_9M';

try {
    let content = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
    console.log("Original Content Length:", content.length);

    // Split by newlines
    let lines = content.split(/\r?\n/);

    // Filter out any lines that look like a GEMINI key or are empty/corrupted
    let cleanLines = lines.filter(line => {
        return !line.includes('GEMINI_API_KEY') && line.trim() !== '';
    });

    // Add the key
    cleanLines.push(`GEMINI_API_KEY=${targetKey}`);

    const newContent = cleanLines.join('\n');
    fs.writeFileSync(envPath, newContent);

    console.log("--- WRITTEN CONTENT ---");
    console.log(newContent);
    console.log("-----------------------");

} catch (e) {
    console.error(e);
}
