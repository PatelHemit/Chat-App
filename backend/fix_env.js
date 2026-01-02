const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');

try {
    let content = fs.readFileSync(envPath, 'utf8');

    // The issue is likely: ...w=majorityGEMINI_API_KEY=AIza...
    // or ...w=majorityGGEMINI_API_KEY=AIza... 
    // We want to replace "majorityGEMINI" with "majority\nGEMINI"

    if (content.includes('majorityGEMINI_API_KEY')) {
        content = content.replace('majorityGEMINI_API_KEY', 'majority\nGEMINI_API_KEY');
        console.log("Fixed: Split properly.");
    } else if (content.includes('majorityGGEMINI_API_KEY')) {
        content = content.replace('majorityGGEMINI_API_KEY', 'majority\nGEMINI_API_KEY');
        console.log("Fixed: Extraneous G removed.");
    } else {
        console.log("No obvious merge found. Checking if key exists.");
    }

    // Ensure proper newlines generally
    if (!content.includes('GEMINI_API_KEY')) {
        console.log("Key missing, appending...");
        content += '\nGEMINI_API_KEY=' + 'AIzaSyDbs9NEwV6z33jhE4v9ujd4zYGQFAnq_9M';
    }

    fs.writeFileSync(envPath, content);
    console.log("Done.");

} catch (e) {
    console.error(e);
}
