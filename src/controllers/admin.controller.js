const User = require("../models/User");
const Booking = require("../models/Booking");
const Turf = require("../models/Turf");

// ✅ GET ADMIN DASHBOARD STATS
const getAdminDashboard = async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];

    const [totalUsers, totalTurfs, totalBookings, todayBookings, recentBookings, revenue] =
      await Promise.all([
        User.countDocuments(),
        Turf.countDocuments({ isActive: true }),
        Booking.countDocuments({ status: "booked" }),
        Booking.countDocuments({ date: today, status: "booked" }),
        Booking.find({ status: "booked" })
          .populate("user", "name email")
          .populate("turf", "name")
          .sort({ createdAt: -1 })
          .limit(5),
        Booking.aggregate([
          { $match: { status: "booked" } },
          { $group: { _id: null, total: { $sum: "$totalPrice" } } },
        ]),
      ]);

    // Weekly bookings (last 7 days)
    const weeklyData = await Promise.all(
      Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        const dateStr = d.toISOString().split("T")[0];
        return Booking.countDocuments({
          date: dateStr,
          status: "booked",
        }).then((count) => ({ date: dateStr, count }));
      })
    );

    res.json({
      success: true,
      data: {
        totalUsers,
        totalTurfs,
        totalBookings,
        todayBookings,
        totalRevenue: revenue[0]?.total || 0,
        recentBookings,
        weeklyData,
      },
    });
  } catch (err) {
    console.error("Dashboard Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ✅ GET ALL USERS
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find()
      .select("-password")
      .sort({ createdAt: -1 });
    res.json({ success: true, count: users.length, data: users });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ✅ GET USER BOOKINGS
const getUserBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.params.id })
      .populate("turf", "name location")
      .sort({ createdAt: -1 });
    res.json({ success: true, count: bookings.length, data: bookings });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = { getAdminDashboard, getAllUsers, getUserBookings };