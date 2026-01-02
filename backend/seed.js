const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const connectDB = require('./config/db');

dotenv.config();
connectDB();

const seedData = async () => {
    try {
        const userExists = await User.findOne({ phone: "9876543210" });
        if (!userExists) {
            await User.create({
                phone: "9876543210",
                name: "Test User",
                about: "I am a test user"
            });
            console.log("Test User Created");
        } else {
            console.log("Test User already exists");
        }
        process.exit();
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

seedData();
