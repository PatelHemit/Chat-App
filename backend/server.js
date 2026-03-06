require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require("socket.io");
const cors = require('cors');
const ImageKit = require("imagekit");
const connectDB = require('./config/db');
const chatRoutes = require('./routes/chatRoutes');
const userRoutes = require('./routes/userRoutes');
const authRoutes = require('./routes/authRoutes');
const statusRoutes = require('./routes/statusRoutes');
const callRoutes = require('./routes/callRoutes');
const communityRoutes = require('./routes/communityRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const { Expo } = require('expo-server-sdk');
const expo = new Expo();
const User = require('./models/User');
const Message = require('./models/Message'); // Import Message model
const Chat = require('./models/Chat');
const Call = require('./models/Call');
const logNotif = require('./utils/logger');

// Initialize Firebase Admin SDK for FCM
const admin = require('firebase-admin');
try {
    const serviceAccount = require('./serviceAccountKey.json');
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });
    console.log('[Firebase] Admin SDK initialized successfully');
} catch (e) {
    console.error('[Firebase] Admin SDK init error:', e.message);
}


const app = express();
const server = http.createServer(app);

// Connect to Database
connectDB();

// Middleware
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url} - ${res.statusCode} (${duration}ms)`);
    });
    next();
});
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ImageKit Setup
const imagekit = new ImageKit({
    publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
    urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT
});

console.log("ImageKit Init:");
console.log("Public Key Loaded:", process.env.IMAGEKIT_PUBLIC_KEY ? "YES (" + process.env.IMAGEKIT_PUBLIC_KEY.substring(0, 5) + "...)" : "NO");
console.log("Private Key Loaded:", process.env.IMAGEKIT_PRIVATE_KEY ? "YES" : "NO");
console.log("Url Endpoint Loaded:", process.env.IMAGEKIT_URL_ENDPOINT ? "YES" : "NO");

// Test ImageKit Connection
imagekit.listFiles({
    limit: 1
}, function (error, result) {
    if (error) {
        console.error("❌ ImageKit Connection FAILED: Keys are invalid or don't match.");
        console.error("Error Detail:", error.message);
    } else {
        console.log("✅ ImageKit Connection SUCCESS: Keys are valid.");
    }
});

// Socket.io Setup
const io = new Server(server, {
    cors: {
        origin: "*", // Allow all origins for now (configure for prod later)
        methods: ["GET", "POST"]
    }
});

app.set("io", io);

// Global Online Users Map: <userId, Set of socketIds>
const onlineUsers = new Map();
// QR Session Map: <sessionId, socketId>
const qrSessions = new Map();

io.on("connection", (socket) => {
    console.log("Connected to socket.io");

    // QR Login Events
    socket.on("join-qr-room", (sessionId) => {
        socket.join(sessionId);
        qrSessions.set(sessionId, socket.id);
        console.log(`[QR-LINK] Laptop joined QR room: ${sessionId} (Socket: ${socket.id})`);
    });

    socket.on("setup", (userData) => {
        if (!userData) {
            console.warn("[Socket] setup event received with NULL userData. Skipping.");
            return;
        }

        const userId = userData._id?.toString() || (typeof userData === 'string' ? userData : null);

        if (!userId) {
            console.warn("[Socket] setup event: Could not extract userId from payload.", userData);
            return;
        }

        socket.join(userId);
        logNotif("[Socket] User joined personal room: " + userId);

        // Track online user (support multiple devices/tabs)
        if (!onlineUsers.has(userId)) {
            onlineUsers.set(userId, new Set());
        }
        onlineUsers.get(userId).add(socket.id);

        logNotif(`[Socket] User Online: ${userId} (Sessions: ${onlineUsers.get(userId).size})${userData.platform ? ` - ${userData.platform}` : ""}`);

        // Broadcast to all clients that this user is online
        io.emit("user-online", userId);

        socket.emit("connected");
    });

    socket.on("check-online", (userId, callback) => {
        const isOnline = onlineUsers.has(userId.toString());
        if (callback) callback(isOnline);
    });

    socket.on("join chat", (room) => {
        socket.join(room);
        console.log("User Joined Room: " + room);
    });

    socket.on("new message", async (newMessageReceived) => {
        let chat = newMessageReceived.chat;
        if (!chat || !chat._id) return;

        try {
            const Chat = require('./models/Chat');
            const latestChat = await Chat.findById(chat._id)
                .populate("users", "name profilePic email notificationsMuted")
                .select("+mutedBy");
            if (latestChat) {
                chat = latestChat;
                newMessageReceived.chat = latestChat;
            }
        } catch (err) {
            console.error("[Socket] Error fetching latest chat:", err);
        }

        const chatIdStr = chat._id.toString();
        const senderIdStr = newMessageReceived.sender._id.toString();

        const notificationPromises = chat.users.map(async (user) => {
            const userIdStr = user._id ? user._id.toString() : user.toString();
            if (userIdStr === senderIdStr) return;

            const userSocketIds = onlineUsers.get(userIdStr);
            const isUserOnline = userSocketIds && userSocketIds.size > 0;

            // A user is "in chat" if AT LEAST ONE of their active sockets is in the chat room
            const socketsInRoom = io.sockets.adapter.rooms.get(chatIdStr);
            const isUserInChat = isUserOnline && socketsInRoom && Array.from(userSocketIds).some(sid => socketsInRoom.has(sid));

            logNotif(`[Notif-Logic] Recipient: ${user.name} (${userIdStr})`);
            logNotif(`[Notif-Logic] -- Online: ${!!isUserOnline} (Sessions: ${userSocketIds?.size || 0})`);
            logNotif(`[Notif-Logic] -- In Chat Room: ${!!isUserInChat}`);

            const personalRoom = io.sockets.adapter.rooms.get(userIdStr);
            const personalRoomSize = personalRoom ? personalRoom.size : 0;

            if (isUserInChat) {
                try {
                    const updateObj = {};
                    if (chat.isGroupChat) {
                        updateObj.$addToSet = {
                            deliveredTo: { user: userIdStr, deliveredAt: new Date() },
                            readBy: { user: userIdStr, readAt: new Date() }
                        };
                    } else {
                        updateObj.status = "read";
                        newMessageReceived.status = "read";
                    }
                    await Message.findByIdAndUpdate(newMessageReceived._id, updateObj);

                    const senderSocketId = onlineUsers.get(senderIdStr);
                    if (senderSocketId) {
                        io.to(senderSocketId).emit("message-status-updated", {
                            messageId: newMessageReceived._id.toString(),
                            status: "read",
                            userId: userIdStr
                        });
                    }
                } catch (error) {
                    console.error("[Socket] Error updating status:", error);
                }
            } else {
                // Not in chat room, check if push should be sent
                logNotif(`[Notif-Logic] -- Proceeding to Push logic...`);
                if (isUserOnline) {
                    try {
                        const updateObj = {};
                        if (chat.isGroupChat) {
                            updateObj.$addToSet = { deliveredTo: { user: userIdStr, deliveredAt: new Date() } };
                        } else {
                            updateObj.status = "delivered";
                        }
                        await Message.findByIdAndUpdate(newMessageReceived._id, updateObj);

                        const senderSocketId = onlineUsers.get(senderIdStr);
                        if (senderSocketId) {
                            io.to(senderSocketId).emit("message-status-updated", {
                                messageId: newMessageReceived._id.toString(),
                                status: "delivered",
                                userId: userIdStr
                            });
                        }
                    } catch (error) {
                        console.error("[Socket] Error marking as delivered:", error);
                    }
                }

                // Push Notification Logic
                const isMuted = chat.mutedBy && Array.isArray(chat.mutedBy) && chat.mutedBy.some(m => {
                    if (!m.user) return false;
                    const mutedUserId = m.user._id ? m.user._id.toString() : m.user.toString();
                    const match = (mutedUserId === userIdStr) && (!m.mutedUntil || new Date(m.mutedUntil) > new Date());
                    if (match) logNotif(`[Push] 🔕 SKIPPING: User ${userIdStr} has muted this chat until ${m.mutedUntil || 'forever'}`);
                    return match;
                });

                if (!isMuted) {
                    try {
                        const User = require('./models/User');
                        const { sendPushNotification } = require('./controllers/notificationControllers');
                        const recipient = await User.findById(userIdStr);
                        if (recipient && recipient.notificationsMuted) {
                            logNotif(`[Push] Skipping notification for ${userIdStr} - Global Mute is ON`);
                            return;
                        }
                        if (recipient && recipient.pushTokens && recipient.pushTokens.length > 0) {
                            const senderName = newMessageReceived.sender.name || 'Someone';
                            const msgType = newMessageReceived.type || 'text';
                            let messagePreview;
                            if (msgType === 'image') messagePreview = '📷 Photo';
                            else if (msgType === 'video') messagePreview = '🎥 Video';
                            else if (msgType === 'audio') messagePreview = '🎵 Voice message';
                            else if (msgType === 'document') messagePreview = '📄 Document';
                            else {
                                const content = newMessageReceived.content || '';
                                messagePreview = content.length > 50 ? content.substring(0, 50) + '...' : content || 'New message';
                            }

                            await sendPushNotification(
                                recipient.pushTokens,
                                chat.isGroupChat ? `${senderName} in ${chat.chatName}` : senderName,
                                messagePreview,
                                { type: 'new_message', chatId: chatIdStr, senderId: senderIdStr }
                            );
                        }
                    } catch (error) {
                        console.error("[Push] Error:", error);
                    }
                }
            }

            if (isUserOnline) {
                io.to(userIdStr).emit("message received", newMessageReceived);
                logNotif(`[Notif-Logic] -- Emitted 'message received' to user room: ${userIdStr}`);
            }
        });

        await Promise.all(notificationPromises);
    });

    socket.on("mark-as-read", async ({ messageId, senderId, chatId, userId }) => {
        try {
            const mongoose = require('mongoose');
            const chatObjId = new mongoose.Types.ObjectId(chatId);
            const userObjId = new mongoose.Types.ObjectId(userId);
            const msgObjId = new mongoose.Types.ObjectId(messageId);

            const chat = await Chat.findById(chatObjId);
            const updateObj = {};
            if (chat && chat.isGroupChat) {
                updateObj.$addToSet = { readBy: { user: userObjId, readAt: new Date() } };
            } else {
                updateObj.status = "read";
            }

            await Message.findByIdAndUpdate(msgObjId, updateObj);

            // Notify the SENDER sessions that their message was read
            const senderSocketIds = onlineUsers.get(senderId.toString());
            if (senderSocketIds) {
                io.to(senderSocketId).emit("message-status-updated", {
                    messageId: messageId.toString(),
                    status: "read",
                    userId: userId
                });
            }
        } catch (error) {
            console.error("Error marking message as read:", error);
        }
    });

    socket.on("mark-chat-read", async ({ chatId, userId }) => {
        if (!chatId || !userId) return;
        console.log(`[Socket] mark-chat-read for chat: ${chatId}, user: ${userId}`);
        try {
            const mongoose = require('mongoose');
            const chatObjId = new mongoose.Types.ObjectId(chatId);
            const userObjId = new mongoose.Types.ObjectId(userId);

            const chat = await Chat.findById(chatObjId);
            if (chat && chat.isGroupChat) {
                // For group, add user to readBy of all messages they haven't read yet
                const result = await Message.updateMany(
                    { chat: chatObjId, sender: { $ne: userObjId }, "readBy.user": { $ne: userObjId } },
                    { $addToSet: { readBy: { user: userObjId, readAt: new Date() } } }
                );
                console.log(`[Socket] Marked ${result.modifiedCount} group messages as read`);
            } else {
                // For 1-on-1, set status to 'read'
                const result = await Message.updateMany(
                    { chat: chatObjId, sender: { $ne: userObjId }, status: { $ne: "read" } },
                    { $set: { status: "read" } }
                );
                console.log(`[Socket] Marked ${result.modifiedCount} 1-on-1 messages as read`);
            }

            console.log(`[Socket] Sending messages-read to room ${chatId} and user room ${userId}`);
            // Notify others in the room that messages have been read
            socket.to(chatId).emit("messages-read", { chatId, userId });
            // ALSO notify the user's other sessions (like Home Screen) to reset counts
            io.to(userId.toString()).emit("messages-read", { chatId, userId });
        } catch (error) {
            console.error("Error marking chat as read:", error);
        }
    });

    // Call Signaling Events
    socket.on("call-user", async ({ to, from, roomName, isVideoCall }) => {
        logNotif(`[Socket] Call from ${from.name} to ${to} (isVideo: ${isVideoCall})`);

        let callId = null;
        try {
            const newCall = await Call.create({
                caller: from._id,
                receiver: to,
                type: isVideoCall ? 'video' : 'audio',
                status: 'missed', // Default to missed until answered
                startedAt: new Date()
            });
            callId = newCall._id;
            console.log(`[Socket] Call log created: ${callId}`);
        } catch (err) {
            console.error("[Socket] Error creating call log:", err);
        }

        // 1. Emit socket event for real-time foreground handling
        const recipientRooms = io.sockets.adapter.rooms.get(to);
        const onlineSessions = recipientRooms ? recipientRooms.size : 0;
        logNotif(`[Socket] Sending 'incoming-call' to user ${to} (${onlineSessions} active sessions)`);
        io.to(to).emit("incoming-call", {
            from,
            roomName,
            isVideoCall,
            callId
        });

        // Also notify the caller about the callId so they can update it
        socket.emit("call-initiated", { callId });

        // 2. Send Push Notification for background/killed state (Expo)
        try {
            const recipient = await User.findById(to);
            if (recipient && recipient.pushTokens && recipient.pushTokens.length > 0) {
                const tokenCount = recipient.pushTokens.length;
                logNotif(`[PushNotif] Processing ${tokenCount} Expo labels for ${recipient.name || to}`);

                const sanitizedFrom = {
                    _id: from._id,
                    name: from.name,
                    profilePic: from.profilePic,
                    phone: from.phone
                };

                // Send individually to isolate "Conflicting Project" errors
                for (let pushToken of [...recipient.pushTokens]) {
                    if (!Expo.isExpoPushToken(pushToken)) {
                        logNotif(`[PushNotif] Pruning INVALID token: ${pushToken}`);
                        await User.findByIdAndUpdate(to, { $pull: { pushTokens: pushToken } });
                        continue;
                    }

                    try {
                        const ticket = await expo.sendPushNotificationsAsync([{
                            to: pushToken,
                            sound: 'default',
                            title: `Incoming ${isVideoCall ? 'Video' : 'Voice'} Call`,
                            body: `${from.name} is calling you...`,
                            data: {
                                type: 'incoming-call',
                                from: sanitizedFrom,
                                roomName,
                                isVideoCall: isVideoCall ? '1' : '0',
                                callId
                            },
                            priority: 'high',
                            channelId: 'incoming-calls'
                        }]);

                        logNotif(`[PushNotif] Ticket for ${pushToken.substring(0, 25)}...: ${JSON.stringify(ticket)}`);

                        // Prune if ticket indicates error
                        if (ticket[0].status === 'error') {
                            const error = ticket[0].details?.error;
                            if (error === 'DeviceNotRegistered' || ticket[0].message?.includes('project')) {
                                logNotif(`[PushNotif] Pruning unusable token: ${pushToken.substring(0, 20)}... (Error: ${error || 'Project mismatch'})`);
                                await User.findByIdAndUpdate(to, { $pull: { pushTokens: pushToken } });
                            }
                        }
                    } catch (err) {
                        logNotif(`[PushNotif] ERROR sending to ${pushToken.substring(0, 20)}...: ${err.message}`);
                        if (err.message.includes('project')) {
                            logNotif(`[PushNotif] Pruning conflicting project token`);
                            await User.findByIdAndUpdate(to, { $pull: { pushTokens: pushToken } });
                        }
                    }
                }
            }
        } catch (error) {
            logNotif(`[PushNotif] CRITICAL error in Expo flow: ${error.message}`);
        }

        // 3. Send FCM Data Message for CallKeep
        try {
            const recipientForFcm = await User.findById(to).select('name fcmTokens');
            if (recipientForFcm && recipientForFcm.fcmTokens && recipientForFcm.fcmTokens.length > 0) {
                logNotif(`[FCM] Sending call data message to ${recipientForFcm.name} (${recipientForFcm.fcmTokens.length} FCM tokens)`);
                for (const fcmToken of recipientForFcm.fcmTokens) {
                    try {
                        const fcmMessage = {
                            token: fcmToken,
                            data: {
                                type: 'incoming-call',
                                callerId: from._id?.toString() || '',
                                callerName: from.name || 'Unknown',
                                callerPic: from.profilePic || '',
                                roomName: roomName || '',
                                isVideoCall: isVideoCall ? '1' : '0',  // '1'=video, '0'=voice; use numeric to avoid 'false' string being truthy
                                callId: callId?.toString() || '',
                                sender: JSON.stringify(from),
                            },
                            android: {
                                priority: 'high',
                                ttl: 30000,
                            },
                        };
                        const fcmResult = await admin.messaging().send(fcmMessage);
                        logNotif(`[FCM] Data message sent successfully to token ${fcmToken.substring(0, 10)}...`);
                    } catch (fcmErr) {
                        logNotif(`[FCM] Error sending to token ${fcmToken.substring(0, 10)}...: ${fcmErr.message}`);
                        if (fcmErr.code === 'messaging/registration-token-not-registered' ||
                            fcmErr.code === 'messaging/invalid-registration-token') {
                            await User.findByIdAndUpdate(to, { $pull: { fcmTokens: fcmToken } });
                            logNotif(`[FCM] Removed invalid token from DB`);
                        }
                    }
                }
            } else {
                logNotif(`[FCM] User ${to} has 0 FCM tokens registered.`);
            }
        } catch (fcmError) {
            logNotif(`[FCM] CRITICAL error in FCM flow: ${fcmError.message}`);
        }
    });

    socket.on("answer-call", ({ to, accepted, roomName, isVideoCall }) => {
        console.log(`[Socket] Call to ${to} ${accepted ? 'Accepted' : 'Rejected'}, isVideoCall: ${isVideoCall}`);
        io.to(to).emit("call-answered", { accepted, roomName, isVideoCall });
    });

    socket.on("end-call", ({ to }) => {
        console.log(`[Socket] Call ended for ${to}`);
        io.to(to).emit("call-ended");
    });

    socket.on("disconnect", () => {
        console.log("USER DISCONNECTED");

        // Find and remove user from onlineUsers
        let disconnectedUserId = null;
        for (let [userId, socketIds] of onlineUsers.entries()) {
            if (socketIds.has(socket.id)) {
                disconnectedUserId = userId;
                break;
            }
        }

        if (disconnectedUserId) {
            const userSessions = onlineUsers.get(disconnectedUserId);
            if (userSessions) {
                userSessions.delete(socket.id);
                if (userSessions.size === 0) {
                    onlineUsers.delete(disconnectedUserId);
                    console.log(`User Offline: ${disconnectedUserId} (All sessions closed)`);
                    io.emit("user-offline", disconnectedUserId);
                } else {
                    console.log(`User Session Closed: ${disconnectedUserId} (Remaining: ${userSessions.size})`);
                }
            }
        }
    });
});

// Routes
// QR Login Routes
app.get('/api/auth/qr-session', (req, res) => {
    const sessionId = Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
    res.json({ sessionId });
});

app.post('/api/auth/qr-link', async (req, res) => {
    const { sessionId, userId, token } = req.body;
    console.log(`[QR-LINK] Mobile scan received for session: ${sessionId}, user: ${userId}`);

    if (!sessionId || !userId || !token) {
        console.log(`[QR-LINK] Failed: Missing required fields`);
        return res.status(400).json({ message: "Missing required fields" });
    }

    // Find the user to send their full data
    const User = require('./models/User');
    const user = await User.findById(userId);

    if (!user) {
        console.log(`[QR-LINK] Failed: User ${userId} not found`);
        return res.status(404).json({ message: "User not found" });
    }

    // Notify the laptop that login was successful
    console.log(`[QR-LINK] Emitting login-success to sessionId: ${sessionId}`);

    // Diagnostic: Check if anyone is actually in the room
    const clientsInRoom = io.sockets.adapter.rooms.get(sessionId);
    const roomSize = clientsInRoom ? clientsInRoom.size : 0;
    console.log(`[QR-LINK] Clients in room ${sessionId}: ${roomSize}`);

    io.to(sessionId).emit("login-success", {
        token,
        user: {
            _id: user._id,
            name: user.name,
            phone: user.phone,
            profilePic: user.profilePic
        }
    });

    if (roomSize === 0) {
        console.log(`[QR-LINK] ⚠️ WARNING: No laptop is listening in room ${sessionId}. The emit will not be received.`);
    }

    console.log(`[QR-LINK] ✅ Successfully linked session ${sessionId} to user ${userId}`);
    res.json({ success: true });
});

app.get('/', (req, res) => {
    res.send('Backend is running!');
});

app.get('/api/imagekit/auth', function (req, res) {
    var result = imagekit.getAuthenticationParameters();
    res.send({ ...result, publicKey: process.env.IMAGEKIT_PUBLIC_KEY });
});

app.use('/api/chat', chatRoutes);
app.use('/api/user', userRoutes);
app.use('/api/ai', require('./routes/aiRoutes'));
app.use('/api/message', require('./routes/messageRoutes'));
app.use('/api/upload', require('./routes/uploadRoutes'));
app.use('/api/auth', authRoutes);
app.use('/api/status', statusRoutes);
app.use('/api/call', callRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/notification', notificationRoutes);

// Error Handling Middleware
app.use((err, req, res, next) => {
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    console.error(`🔥 [Error] ${statusCode}:`, err.message);
    res.status(statusCode).json({
        message: err.message || "Internal Server Error",
        error: err.message,
        stack: process.env.NODE_ENV === 'production' ? null : err.stack
    });
});

// Start Server
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`[Backend] Listening on IPv4 0.0.0.0:${PORT}`);
    console.log(`[Backend] Accessible locally at http://localhost:${PORT}`);
    // No hardcoded IPs to avoid confusion
});
