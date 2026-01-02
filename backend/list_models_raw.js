const https = require('https');

const apiKey = "AIzaSyDbs9NEwV6z33jhE4v9ujd4zYGQFAnq_9M";
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

console.log("Listing Models...");

const req = https.get(url, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    let body = '';
    res.on('data', (chunk) => body += chunk);
    res.on('end', () => {
        try {
            const data = JSON.parse(body);
            console.log("--- START MODEL LIST ---");
            data.models.forEach(m => {
                console.log(m.name);
            });
            console.log("--- END MODEL LIST ---");
        } catch (e) {
            console.log(body);
        }
    });
});

req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
});
