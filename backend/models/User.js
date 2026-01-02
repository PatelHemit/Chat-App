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
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('User', userSchema);
