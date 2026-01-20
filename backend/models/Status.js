const mongoose = require('mongoose');

const statusSchema = mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    mediaUrl: {
        type: String,
        required: true
    },
    mediaType: {
        type: String,
        enum: ["image", "video"],
        default: "image"
    },
    caption: {
        type: String,
        trim: true
    },
    viewedBy: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }]
}, {
    timestamps: true,
});

// Optional: Auto-delete after 24 hours (86400 seconds)
statusSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 });

module.exports = mongoose.model("Status", statusSchema);
