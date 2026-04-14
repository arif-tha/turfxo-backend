const mongoose = require("mongoose");
require("dotenv").config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  try {
    await mongoose.connection.collection("bookings").dropIndex("slot_1_status_1");
    console.log("✅ Old index dropped!");
  } catch (e) {
    console.log("Index already gone or error:", e.message);
  }
  process.exit();
}).catch(console.error);