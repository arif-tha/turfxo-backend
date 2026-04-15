const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

// Routes
const authRoutes = require("./routes/auth.routes");
const turfRoutes = require("./routes/turf.routes");
const slotRoutes = require("./routes/slot.routes");
const bookingRoutes = require("./routes/booking.routes");
const adminRoutes = require("./routes/admin.routes");
const userRoutes = require("./routes/user.routes");
const paymentRoutes = require("./routes/payment.routes"); // ✅ ADD

const { errorHandler } = require("./middleware/error.middleware");

const app = express();

// ✅ Webhook ke liye raw body — express.json() se PEHLE likhna zaroori hai
app.use("/api/payments/webhook", express.raw({ type: "application/json" }));

app.use(cors({
  origin: "https://turfxo.vercel.app",
  allowedHeaders: ["Content-Type", "Authorization"],
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"]
}));
app.use(express.json());
app.use(morgan("dev"));

// Health Check
app.get("/", (req, res) => res.send("Turf Booking API Running..."));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/turfs", turfRoutes);
app.use("/api/slots", slotRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/users", userRoutes);
app.use("/api/payments", paymentRoutes); // ✅ ADD

// 404
app.use((req, res) => res.status(404).json({ success: false, message: "Route not found" }));

// Global Error Handler
app.use(errorHandler);

module.exports = app;