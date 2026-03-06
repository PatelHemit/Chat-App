const fs = require('fs');
const path = require('path');

const logDir = path.join(__dirname, 'logs');
const logFile = path.join(logDir, 'notifications.log');

// Ensure logs directory exists
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

const logNotif = (message) => {
    const timestamp = new Date().toISOString();
    const formattedMessage = `[${timestamp}] ${message}\n`;

    // Console log as well
    console.log(message);

    // Append to file
    try {
        fs.appendFileSync(logFile, formattedMessage);
    } catch (err) {
        console.error("Failed to write to log file:", err);
    }
};

module.exports = logNotif;
