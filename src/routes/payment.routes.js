const express = require("express");
const router = express.Router();
const {
  createOrder,
  verifyPayment,
  handleFailedPayment,
  handleWebhook,
} = require("../controllers/payment.controller");
const { protect } = require("../middleware/auth.middleware");

// Webhook ke liye auth nahi — Razorpay call karta hai
router.post("/webhook", handleWebhook);

// Baaki sab protected
router.post("/create-order", protect, createOrder);
router.post("/verify", protect, verifyPayment);
router.post("/failed", protect, handleFailedPayment);

module.exports = router;