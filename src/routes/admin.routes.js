const express = require("express");
const router = express.Router();

const { protect, authorize } = require("../middleware/auth.middleware");
const {
  getAdminDashboard,
  getAllUsers,
  getUserBookings,
} = require("../controllers/admin.controller");

// 📊 Dashboard stats
router.get("/dashboard", protect, authorize("admin"), getAdminDashboard);

// 👥 All users
router.get("/users", protect, authorize("admin"), getAllUsers);

// 👤 User bookings
router.get("/users/:id/bookings", protect, authorize("admin"), getUserBookings);

module.exports = router;