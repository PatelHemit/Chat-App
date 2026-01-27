const axios = require('axios');

async function testOTP() {
    try {
        const response = await axios.post('http://localhost:3000/api/auth/send-otp', {
            phone: '+919999999999'
        });
        console.log('Success:', response.data);
    } catch (error) {
        if (error.response) {
            console.log('Error Status:', error.response.status);
            console.log('Error Data:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.log('Error Message:', error.message);
        }
    }
}

testOTP();
