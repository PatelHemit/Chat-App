const { Expo } = require('expo-server-sdk');
const expo = new Expo();

const sendTestPush = async () => {
    const tokens = [
        "ExponentPushToken[6C-E7VFoo7PkQTHwTnIY9oi]",
        "ExponentPushToken[MrIBepJL2ZjrJ-iE13eC8J]"
    ];

    const messages = [];
    for (const token of tokens) {
        if (Expo.isExpoPushToken(token)) {
            messages.push({
                to: token,
                sound: 'default',
                title: '🔔 Multi-Token Test',
                body: 'Checking which token is active...',
                data: { test: true },
                priority: 'high',
            });
        }
    }

    console.log("Sending direct test push...");
    try {
        const chunks = expo.chunkPushNotifications(messages);
        for (const chunk of chunks) {
            const tickets = await expo.sendPushNotificationsAsync(chunk);
            console.log("Tickets:", JSON.stringify(tickets));
        }
    } catch (error) {
        console.error("Error:", error);
    }
};

sendTestPush();
