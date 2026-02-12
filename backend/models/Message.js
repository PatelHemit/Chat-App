const mongoose = require('mongoose');

const messageSchema = mongoose.Schema({
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    content: { type: String, trim: true },
    chat: { type: mongoose.Schema.Types.ObjectId, ref: "Chat", index: true },
    readBy: [
        {
            user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
            readAt: { type: Date, default: Date.now }
        }
    ],
    deliveredTo: [
        {
            user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
            deliveredAt: { type: Date, default: Date.now }
        }
    ],
    type: {
        type: String,
        enum: ["text", "image", "audio", "video", "document"],
        default: "text",
    },
    status: {
        type: String,
        enum: ["sent", "delivered", "read"],
        default: "sent",
    },
    duration: {
        type: Number,
        default: 0
    },
    fileUrl: {
        type: String
    },
    fileMetadata: {
        fileName: { type: String },
        fileSize: { type: Number },
        fileExtension: { type: String },
        mimeType: { type: String }
    },
    replyTo: { type: mongoose.Schema.Types.ObjectId, ref: "Message" },
    reactions: [
        {
            user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
            emoji: { type: String }
        }
    ],
    deletedFor: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    starredBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }]
}, {
    timestamps: true,
});

module.exports = mongoose.model("Message", messageSchema);
