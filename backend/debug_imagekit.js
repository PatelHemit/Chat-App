require('dotenv').config();

console.log("Loaded Environment Variables Keys:");
const keys = Object.keys(process.env);
keys.forEach(key => {
    if (key.startsWith('IMAGEKIT')) {
        console.log(`- ${key}: Length=${process.env[key].length}, ValueStart='${process.env[key].substring(0, 3)}...'`);
    }
});

console.log("\nChecking for potential typos in .env loading...");
// Check if maybe they are loaded with whitespace keys?
// We need to parse .env file manually to see raw keys if using dotenv doesn't show them in process.env properly
// But process.env should have them if dotenv loaded them.

const fs = require('fs');
try {
    const envConfig = fs.readFileSync('.env', 'utf8');
    const lines = envConfig.split('\n');
    console.log("\nRaw .env file line analysis (Key/Value separation):");
    lines.forEach((line, index) => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
            const parts = trimmed.split('=');
            const key = parts[0];
            console.log(`Line ${index + 1}: Key='${key}' (Length: ${key.length})`);
        }
    });
} catch (e) {
    console.log("Could not read .env file directly.");
}
