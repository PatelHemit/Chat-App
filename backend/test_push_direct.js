const { Expo } = require('expo-server-sdk');
const expo = new Expo();

const sendTestPush = async () => {
    const token = "ExponentPushToken[MrIBepJL2ZjrJ-iE13eC8J]"; // Priya's token from logs

    if (!Expo.isExpoPushToken(token)) {
        console.error("Invalid token");
        return;
    }

    const messages = [{
        to: token,
        sound: 'default',
        title: '🔥 Direct Test 🔥',
        body: 'If you see this, background notifications are working!',
        data: { test: true },
        priority: 'high',
        channelId: 'sportflash-notifications',
    }];

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
