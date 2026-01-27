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
const Message = require('./models/Message'); // Import Message model

const app = express();
const server = http.createServer(app);

// Connect to Database
connectDB();

// Middleware
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

// Global Online Users Map: <userId, socketId>
const onlineUsers = new Map();

io.on("connection", (socket) => {
    console.log("Connected to socket.io");

    socket.on("setup", (userData) => {
        socket.join(userData._id);

        // Track online user
        onlineUsers.set(userData._id, socket.id);
        console.log(`User Online: ${userData._id}`);

        // Broadcast to all clients that this user is online
        io.emit("user-online", userData._id);

        socket.emit("connected");
    });

    socket.on("check-online", (userId, callback) => {
        const isOnline = onlineUsers.has(userId);
        if (callback) callback(isOnline);
    });

    socket.on("join chat", (room) => {
        socket.join(room);
        console.log("User Joined Room: " + room);
    });

    socket.on("new message", async (newMessageRecieved) => {
        var chat = newMessageRecieved.chat;

        if (!chat.users) return console.log("chat.users not defined");

        chat.users.forEach(async (user) => {
            if (user._id == newMessageRecieved.sender._id) return;

            // Check if user is online
            const isUserOnline = onlineUsers.has(user._id);
            if (isUserOnline) {
                try {
                    // Update message status to delivered in DB
                    await Message.findByIdAndUpdate(newMessageRecieved._id, { status: "delivered" });
                    newMessageRecieved.status = "delivered"; // Update local object to send correct status

                    // Notify the SENDER that the message was delivered
                    const senderSocketId = onlineUsers.get(newMessageRecieved.sender._id);
                    if (senderSocketId) {
                        io.to(senderSocketId).emit("message-status-updated", { messageId: newMessageRecieved._id, status: "delivered" });
                    }
                } catch (error) {
                    console.error("Error updating message status to delivered:", error);
                }
            }

            socket.in(user._id).emit("message received", newMessageRecieved);
        });
    });

    socket.on("mark-as-read", async ({ messageId, senderId }) => {
        try {
            await Message.findByIdAndUpdate(messageId, { status: "read" });
            // Notify the SENDER that their message was read
            const senderSocketId = onlineUsers.get(senderId);
            if (senderSocketId) {
                io.to(senderSocketId).emit("message-status-updated", { messageId, status: "read" });
            }
        } catch (error) {
            console.error("Error marking message as read:", error);
        }
    });

    socket.on("mark-chat-read", async ({ chatId, userId }) => {
        if (!chatId || !userId) return;
        try {
            // Update all messages in this chat sent by OTHER users to 'read'
            await Message.updateMany(
                { chat: chatId, sender: { $ne: userId }, status: { $ne: "read" } },
                { $set: { status: "read" } }
            );

            // Notify others in the room that messages have been read
            // This tells the sender(s) of those messages to update their UI to blue ticks
            socket.to(chatId).emit("messages-read", { chatId });
        } catch (error) {
            console.error("Error marking chat as read:", error);
        }
    });

    socket.on("disconnect", () => {
        console.log("USER DISCONNECTED");

        // Find and remove user from onlineUsers
        let disconnectedUserId = null;
        for (let [userId, socketId] of onlineUsers.entries()) {
            if (socketId === socket.id) {
                disconnectedUserId = userId;
                break;
            }
        }

        if (disconnectedUserId) {
            onlineUsers.delete(disconnectedUserId);
            console.log(`User Offline: ${disconnectedUserId}`);
            io.emit("user-offline", disconnectedUserId);
        }
    });
});

// Routes
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
    console.error("🔥 Global Error Handler:", err.stack);
    res.status(500).json({
        message: "Internal Server Error",
        error: err.message,
        stack: process.env.NODE_ENV === 'production' ? null : err.stack
    });
});

// Start Server
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT} (accessible at http://192.168.1.36:${PORT})`);
});
