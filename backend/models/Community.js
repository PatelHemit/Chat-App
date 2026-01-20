const mongoose = require('mongoose');

const communitySchema = mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        default: ""
    },
    profilePic: {
        type: String,
        default: ""
    },
    admin: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    // A community links multiple group chats together
    groups: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Chat"
    }],
    users: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }]
}, {
    timestamps: true,
});

module.exports = mongoose.model("Community", communitySchema);
