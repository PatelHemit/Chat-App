const fs = require('fs');
const path = require('path');

const logFile = path.join(__dirname, 'logs', 'notifications.log');

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
