const mongoose = require("mongoose");

const turfSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true
    },
    location: {
      city: String,
      address: String
    },
    pricePerHour: {
      type: Number,
      required: true
    },
    sportsType: {
      type: String,
      enum: ["football", "cricket", "badminton"]
    },
    images: [String],
    isActive: {
      type: Boolean,
      default: true
    },

    // ✅ NEW — Slot generation config
    openTime: {
      type: String,
      default: "06:00"   // 6 AM
    },
    closeTime: {
      type: String,
      default: "22:00"   // 10 PM
    },
    slotDuration: {
      type: Number,
      default: 60        // minutes
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Turf", turfSchema);