const express = require("express");
const router = express.Router();

const {
  createBooking,
  getMyBookings,
  cancelBooking,
  rescheduleBooking,
  getAllBookings // ✅ ADD
} = require("../controllers/booking.controller");

const { protect, authorize } = require("../middleware/auth.middleware"); // ✅ ADD authorize

// 🔐 CREATE BOOKING
router.post("/", protect, createBooking);

// 📖 GET MY BOOKINGS (USER)
router.get("/my", protect, getMyBookings);

// 🧑‍💼 GET ALL BOOKINGS (ADMIN ONLY) ✅ NEW
router.get("/", protect, authorize("admin"), getAllBookings);

// ❌ CANCEL BOOKING
router.put("/cancel/:id", protect, cancelBooking);

// 🔄 RESCHEDULE BOOKING
router.put("/reschedule/:id", protect, rescheduleBooking);

module.exports = router;