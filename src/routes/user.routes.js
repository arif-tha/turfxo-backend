const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Booking = require("../models/Booking");
const { protect, authorize } = require("../middleware/auth.middleware");

// ✅ GET ALL USERS (Admin only)
router.get("/", protect, authorize("admin"), async (req, res) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    res.json({ success: true, count: users.length, data: users });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ✅ GET USER BOOKINGS (Admin only)
router.get("/:id/bookings", protect, authorize("admin"), async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.params.id })
      .populate("turf", "name location")
      .sort({ createdAt: -1 });
    res.json({ success: true, count: bookings.length, data: bookings });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;