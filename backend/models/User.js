const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    phone: {
        type: String,
        required: true,
        unique: true
    },
    name: {
        type: String,
        default: ""
    },
    about: {
        type: String,
        default: "Hey there! I am using WhatsApp."
    },
    profilePic: {
        type: String,
        default: ""
    },
    pushTokens: {
        type: [String],
        default: []
    },
    blockedUsers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }],
    statusPrivacy: {
        type: {
            type: String,
            enum: ['contacts', 'except', 'only'],
            default: 'contacts'
        },
        excludedUsers: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        }],
        includedUsers: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        }]
    },
    notificationsMuted: {
        type: Boolean,
        default: false
    },
}, {
    timestamps: true
});

userSchema.pre('save', function () {
    if (!this.blockedUsers) {
        this.blockedUsers = [];
    }
});

module.exports = mongoose.model('User', userSchema);
