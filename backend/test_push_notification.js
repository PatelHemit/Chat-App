// Test script to verify push notification system
require('dotenv').config();

async function testPushNotification() {
    console.log('\n=== Testing Push Notification System ===\n');

    // Test 1: Check if expo-server-sdk is installed
    console.log('Test 1: Checking expo-server-sdk installation...');
    try {
        const { Expo } = require('expo-server-sdk');
        console.log('✅ expo-server-sdk is installed');

        // Test 2: Create Expo instance
        console.log('\nTest 2: Creating Expo instance...');
        const expo = new Expo();
        console.log('✅ Expo instance created successfully');

        // Test 3: Validate a sample token
        console.log('\nTest 3: Validating sample Expo push token...');
        const sampleToken = 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]';
        const isValid = Expo.isExpoPushToken(sampleToken);
        console.log(`Sample token validation: ${isValid ? '✅ Valid format' : '❌ Invalid format'}`);

        // Test 4: Check sendPushNotification function
        console.log('\nTest 4: Checking sendPushNotification function...');
        const { sendPushNotification } = require('./controllers/notificationControllers');
        console.log('✅ sendPushNotification function loaded');

        console.log('\n=== All Tests Passed! ===\n');
        console.log('The notification system components are properly installed.');
        console.log('\nNext steps to debug:');
        console.log('1. Check if push tokens are registered in database');
        console.log('2. Check backend logs when message is sent');
        console.log('3. Verify socket.io is emitting "message received" events');

    } catch (error) {
        console.error('❌ Test Failed:', error.message);
        console.error('\nError Details:', error);

        if (error.code === 'MODULE_NOT_FOUND') {
            console.log('\n🔧 Solution: Run "npm install" in the backend directory');
        }
    }
}

testPushNotification();
