const mongoose = require('mongoose');

const callSchema = mongoose.Schema({
    caller: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    receiver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    type: {
        type: String,
        enum: ["audio", "video"],
        default: "audio"
    },
    status: {
        type: String,
        enum: ["missed", "answered", "rejected"],
        default: "missed"
    },
    duration: {
        type: Number, // In seconds
        default: 0
    },
    startedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true,
});

module.exports = mongoose.model("Call", callSchema);
