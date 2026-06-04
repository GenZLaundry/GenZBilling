const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const ManualEntry = require('./models/ManualEntry');

async function main() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const entries = await ManualEntry.find().sort({ createdAt: -1 }).limit(5);
    console.log(`Found ${entries.length} manual entries:`);
    entries.forEach(e => {
      console.log(`ID: ${e._id}, Name: ${e.customerName}, Phone: ${e.phone}, Items: ${JSON.stringify(e.items)}, Pickup: ${e.pickupDate}, Delivery: ${e.deliveryDate}`);
    });
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

main();
