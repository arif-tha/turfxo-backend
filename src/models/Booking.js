const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    turf: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Turf",
      required: true
    },
    date: { type: String, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },

    // ✅ Player details — naye fields
    playerName: { type: String, default: null },
    playerPhone: { type: String, default: null },
    players: { type: Number, default: 1 },

    status: {
      type: String,
      enum: ["pending", "booked", "cancelled", "completed"],
      default: "pending",
      index: true
    },
    totalPrice: { type: Number, required: true, min: 0 },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending"
    },
    paymentId: { type: String, default: null },
    orderId: { type: String, default: null },
    razorpaySignature: { type: String, default: null },
    paymentFailureReason: { type: String, default: null },
    bookingDate: { type: Date, default: Date.now, index: true }
  },
  { timestamps: true }
);

bookingSchema.index(
  { turf: 1, date: 1, startTime: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: "booked" } }
);

bookingSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model("Booking", bookingSchema);