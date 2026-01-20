const mongoose = require('mongoose');

const notificationSchema = mongoose.Schema({
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    type: {
        type: String,
        enum: ["group_add", "missed_call", "friend_request", "system_alert"],
        required: true
    },
    content: {
        type: String,
        required: true
    },
    chat: { // Optional: Link to a chat if relevant (e.g. for group add)
        type: mongoose.Schema.Types.ObjectId,
        ref: "Chat"
    },
    isRead: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true,
});

module.exports = mongoose.model("Notification", notificationSchema);
