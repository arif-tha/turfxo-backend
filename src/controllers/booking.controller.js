const Booking = require("../models/Booking");
const Turf = require("../models/Turf");
const bookingService = require("../services/booking.service");

// ✅ CREATE BOOKING
const createBooking = async (req, res, next) => {
  try {
    const { turfId, date, startTime, endTime } = req.body;

    if (!turfId || !date || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: "turfId, date, startTime, endTime required"
      });
    }

    const booking = await bookingService.createBooking(
      req.user._id,
      { turfId, date, startTime, endTime }
    );

    res.status(201).json({
      success: true,
      message: "Booking created successfully",
      data: booking
    });
  } catch (error) {
    console.error("Create Booking Error:", error);
    next(error);
  }
};

// ✅ GET MY BOOKINGS
const getMyBookings = async (req, res, next) => {
  try {
    const bookings = await bookingService.getMyBookings(req.user._id);
    res.json({ success: true, count: bookings.length, data: bookings });
  } catch (error) {
    console.error("Get MyBookings Error:", error);
    next(error);
  }
};

// ✅ GET ALL BOOKINGS (ADMIN)
const getAllBookings = async (req, res, next) => {
  try {
    const bookings = await Booking.find()
      .populate("user", "name email")
      .populate("turf", "name")
      .sort({ createdAt: -1 });

    res.json({ success: true, count: bookings.length, data: bookings });
  } catch (error) {
    console.error("Get All Bookings Error:", error);
    next(error);
  }
};

// ✅ CANCEL BOOKING
const cancelBooking = async (req, res, next) => {
  try {
    const booking = await bookingService.cancelBooking(
      req.params.id,
      req.user._id
    );
    res.json({ success: true, message: "Booking cancelled", data: booking });
  } catch (error) {
    console.error("Cancel Booking Error:", error);
    next(error);
  }
};

// ✅ RESCHEDULE BOOKING
const rescheduleBooking = async (req, res, next) => {
  try {
    const { turfId, date, startTime, endTime } = req.body;
    const booking = await bookingService.rescheduleBooking(
      req.params.id,
      req.user._id,
      { turfId, date, startTime, endTime }
    );
    res.json({ success: true, message: "Booking rescheduled", data: booking });
  } catch (error) {
    console.error("Reschedule Error:", error);
    next(error);
  }
};

module.exports = {
  createBooking,
  getMyBookings,
  getAllBookings,
  cancelBooking,
  rescheduleBooking
};