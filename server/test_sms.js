require('dotenv').config();
const { sendSMS } = require('./services/smsService');

async function testSMS() {
  console.log("Testing Fast2SMS Quick SMS...");
  const result = await sendSMS('9256930727', 'Test SMS from Gen-Z Laundry! Your clothes are ready.');
  console.log("SMS Result:", result);
}
testSMS();
