const mongoose = require("mongoose");
const Booking = require("../models/Booking");
const Turf = require("../models/Turf");
const ApiError = require("../utils/ApiError");

const timeToMinutes = (time) => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

const isTimeInRange = (time, start, end) => {
  const t = timeToMinutes(time);
  const s = timeToMinutes(start);
  const e = timeToMinutes(end);

  if (s < e) {
    return t >= s && t < e;
  }

  return t >= s || t < e;
};

const rangesOverlap = (startA, endA, startB, endB) => {
  return isTimeInRange(startA, startB, endB) || isTimeInRange(startB, startA, endA);
};

// ✅ CREATE BOOKING
const createBooking = async (userId, { turfId, date, startTime, endTime }) => {
  // Double booking check
  const existingBookings = await Booking.find({
    turf: turfId,
    date,
    status: "booked"
  }).select("startTime endTime");

  const hasOverlap = existingBookings.some((booking) =>
    rangesOverlap(startTime, endTime, booking.startTime, booking.endTime)
  );

  if (hasOverlap) {
    throw new ApiError(400, "Slot already booked");
  }

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

// ✅ GET MY BOOKINGS — slot populate hata diya
const getMyBookings = async (userId) => {
  return await Booking.find({ user: userId })
    .populate("turf", "name location images pricePerHour")
    .sort({ createdAt: -1 });
};

// ✅ CANCEL BOOKING — slot logic hata diya
const cancelBooking = async (bookingId, userId) => {
  const booking = await Booking.findById(bookingId);

  if (!booking) throw new ApiError(404, "Booking not found");

  if (booking.user.toString() !== userId.toString()) {
    throw new ApiError(403, "Unauthorized");
  }

  if (booking.status === "cancelled") {
    throw new ApiError(400, "Booking already cancelled");
  }

  booking.status = "cancelled";
  await booking.save();

  return booking;
};

// ✅ RESCHEDULE BOOKING — naye system ke saath
const rescheduleBooking = async (bookingId, userId, { turfId, date, startTime, endTime }) => {
  const booking = await Booking.findById(bookingId);

  if (!booking) throw new ApiError(404, "Booking not found");

  if (booking.user.toString() !== userId.toString()) {
    throw new ApiError(403, "Unauthorized");
  }

  if (booking.status === "cancelled") {
    throw new ApiError(400, "Cannot reschedule cancelled booking");
  }

  // New slot double booking check
  const existingBookings = await Booking.find({
    turf: turfId,
    date,
    status: "booked",
    _id: { $ne: bookingId } // apni booking exclude karo
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