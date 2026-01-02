require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');
const ImageKit = require("imagekit");
const connectDB = require('./config/db');
const generateToken = require('./config/generateToken');
const chatRoutes = require('./routes/chatRoutes');
const userRoutes = require('./routes/userRoutes');

const app = express();
const server = http.createServer(app);

// Connect to Database
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// ImageKit Setup
const imagekit = new ImageKit({
    publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
    urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT
});

// Socket.io Setup
const io = new Server(server, {
    cors: {
        origin: "*", // Allow all origins for now (configure for prod later)
        methods: ["GET", "POST"]
    }
});

io.on("connection", (socket) => {
    console.log("Connected to socket.io");

    socket.on("setup", (userData) => {
        socket.join(userData._id);
        socket.emit("connected");
    });

    socket.on("join chat", (room) => {
        socket.join(room);
        console.log("User Joined Room: " + room);
    });

    socket.on("new message", (newMessageRecieved) => {
        var chat = newMessageRecieved.chat;

        if (!chat.users) return console.log("chat.users not defined");

        chat.users.forEach((user) => {
            if (user._id == newMessageRecieved.sender._id) return;

            socket.in(user._id).emit("message received", newMessageRecieved);
        });
    });

    socket.on("disconnect", () => {
        console.log("USER DISCONNECTED");
    });
});

// Routes
app.get('/', (req, res) => {
    res.send('Backend is running!');
});

app.get('/api/imagekit/auth', function (req, res) {
    var result = imagekit.getAuthenticationParameters();
    res.send(result);
});

app.use('/api/chat', chatRoutes);
app.use('/api/user', userRoutes);
app.use('/api/ai', require('./routes/aiRoutes'));
app.use('/api/message', require('./routes/messageRoutes'));

const User = require('./models/User');

// Mock OTP Storage (In production use Redis/Database)
const otpStore = {};

app.post('/api/auth/send-otp', (req, res) => {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: "Phone number is required" });

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore[phone] = otp;

    console.log(`[OTP] Sending OTP ${otp} to ${phone}`);

    // Return OTP in response for testing purposes (Simulating SMS delivery)
    res.json({ success: true, message: "OTP sent successfully", otp: otp });
});

app.post('/api/auth/verify-otp', async (req, res) => {
    const { phone, otp } = req.body;
    if (!phone || !otp) return res.status(400).json({ error: "Phone and OTP are required" });

    if (otpStore[phone] === otp) {
        delete otpStore[phone]; // Clear OTP after success

        try {
            // Find or Create User
            let user = await User.findOne({ phone });

            if (!user) {
                user = await User.create({ phone });
                console.log(`[DB] New User Created: ${phone}`);
            } else {
                console.log(`[DB] User Found: ${phone}`);
            }

            res.json({
                success: true,
                message: "OTP verified",
                user: user,
                token: generateToken(user._id)
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: "Database Error" });
        }
    } else {
        res.status(400).json({ error: "Invalid OTP" });
    }
});

app.post('/api/user/update-profile', async (req, res) => {
    const { phone, name, about, profilePic } = req.body;
    if (!phone) return res.status(400).json({ error: "Phone is required to update profile" });

    try {
        const user = await User.findOneAndUpdate(
            { phone },
            { name, about, profilePic },
            { new: true } // Return updated document
        );

        if (!user) return res.status(404).json({ error: "User not found" });

        res.json({ success: true, user });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server Error" });
    }
});

// Start Server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
