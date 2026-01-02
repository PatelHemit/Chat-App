const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const connectDB = require('./config/db');

dotenv.config();
connectDB();

const users = [
    { name: "Alice Wonderland", phone: "1111111111", about: "In a rabbit hole" },
    { name: "Bob Builder", phone: "2222222222", about: "Can we fix it?" },
    { name: "Charlie Chaplin", phone: "3333333333", about: "Silent comedian" },
    { name: "David Beckham", phone: "4444444444", about: "Footballer" },
    { name: "Eve Polastri", phone: "5555555555", about: "Spying" }
];

const populateUsers = async () => {
    try {
        for (const u of users) {
            const exists = await User.findOne({ phone: u.phone });
            if (!exists) {
                await User.create(u);
                console.log(`Created: ${u.name}`);
            } else {
                console.log(`Skipped: ${u.name} (Exists)`);
            }
        }
        console.log("Done adding users.");
        process.exit();
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

populateUsers();
