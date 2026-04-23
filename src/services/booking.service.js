const mongoose = require("mongoose");
const Booking = require("../models/Booking");
const Turf = require("../models/Turf");
const ApiError = require("../utils/ApiError");
const Razorpay = require("razorpay");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const timeToMinutes = (time) => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

const isTimeInRange = (time, start, end) => {
  const t = timeToMinutes(time);
  const s = timeToMinutes(start);
  const e = timeToMinutes(end);
  if (s < e) return t >= s && t < e;
  return t >= s || t < e;
};

const rangesOverlap = (startA, endA, startB, endB) => {
  return isTimeInRange(startA, startB, endB) || isTimeInRange(startB, startA, endA);
};

// ✅ CREATE BOOKING
const createBooking = async (userId, { turfId, date, startTime, endTime }) => {
  const existingBookings = await Booking.find({
    turf: turfId,
    date,
    status: "booked"
  }).select("startTime endTime");

  const hasOverlap = existingBookings.some((booking) =>
    rangesOverlap(startTime, endTime, booking.startTime, booking.endTime)
  );

  if (hasOverlap) throw new ApiError(400, "Slot already booked");

  const turf = await Turf.findById(turfId);
  if (!turf) throw new ApiError(404, "Turf not found");

  const booking = await Booking.create({
    user: userId,
    turf: turfId,
    date,
    startTime,
    endTime,
    totalPrice: turf.pricePerHour
  });

  return booking;
};

// ✅ GET MY BOOKINGS
const getMyBookings = async (userId) => {
  return await Booking.find({ user: userId })
    .populate("turf", "name location images pricePerHour")
    .sort({ createdAt: -1 });
};

// ✅ CANCEL BOOKING — Auto Razorpay Refund
const cancelBooking = async (bookingId, userId) => {
  const booking = await Booking.findById(bookingId);

  if (!booking) throw new ApiError(404, "Booking not found");

  if (booking.user.toString() !== userId.toString()) {
    throw new ApiError(403, "Unauthorized");
  }

  if (booking.status === "cancelled") {
    throw new ApiError(400, "Booking already cancelled");
  }

  // ✅ Auto refund agar payment hua tha
  let refundId = null;
  let refundStatus = "not_applicable";

  if (booking.paymentStatus === "paid" && booking.paymentId) {
    try {
      const refund = await razorpay.payments.refund(booking.paymentId, {
        amount: booking.totalPrice * 100, // paise mein
        speed: "normal",                  // "normal" = 5-7 days, "optimum" = instant (extra charges)
        notes: {
          reason: "Booking cancelled by user",
          bookingId: bookingId.toString(),
        },
      });

      refundId = refund.id;
      refundStatus = "initiated";
      console.log(`✅ Refund initiated: ${refund.id} for booking ${bookingId}`);
    } catch (err) {
      console.error("❌ Razorpay Refund Error:", err);
      // Refund fail hone pe bhi booking cancel ho — admin manually handle karega
      refundStatus = "failed";
    }
  }

  // Booking cancel karo
  booking.status = "cancelled";
  booking.paymentStatus = refundStatus === "initiated" ? "refunded" : booking.paymentStatus;
  booking.refundId = refundId;
  booking.refundStatus = refundStatus;
  await booking.save();

  return booking;
};

// ✅ RESCHEDULE BOOKING
const rescheduleBooking = async (bookingId, userId, { turfId, date, startTime, endTime }) => {
  const booking = await Booking.findById(bookingId);

  if (!booking) throw new ApiError(404, "Booking not found");

  if (booking.user.toString() !== userId.toString()) {
    throw new ApiError(403, "Unauthorized");
  }

  if (booking.status === "cancelled") {
    throw new ApiError(400, "Cannot reschedule cancelled booking");
  }

  const existingBookings = await Booking.find({
    turf: turfId,
    date,
    status: "booked",
    _id: { $ne: bookingId }
  }).select("startTime endTime");

  const hasOverlap = existingBookings.some((existing) =>
    rangesOverlap(startTime, endTime, existing.startTime, existing.endTime)
  );

  if (hasOverlap) throw new ApiError(400, "New slot already booked");

  booking.turf = turfId;
  booking.date = date;
  booking.startTime = startTime;
  booking.endTime = endTime;

  await booking.save();
  return booking;
};

module.exports = {
  createBooking,
  getMyBookings,
  cancelBooking,
  rescheduleBooking
};