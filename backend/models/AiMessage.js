const mongoose = require('mongoose');

const aiMessageSchema = mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    sender: { type: String, enum: ["user", "ai"], required: true },
    content: { type: String, trim: true, required: true },
    type: { type: String, enum: ["text", "audio"], default: "text" },
    duration: { type: Number }, // For audio messages
}, {
    timestamps: true,
});

module.exports = mongoose.model("AiMessage", aiMessageSchema);
