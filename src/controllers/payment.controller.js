const Booking = require("../models/Booking");
const Turf = require("../models/Turf");
const {
  createRazorpayOrder,
  verifyPaymentSignature,
  verifyWebhookSignature,
} = require("../services/payment.service");

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

// POST /api/payments/create-order
const createOrder = async (req, res, next) => {
  try {
    // ✅ Player details bhi receive karo
    const { turfId, date, startTime, endTime, playerName, playerPhone, players } = req.body;

    if (!turfId || !date || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: "turfId, date, startTime, endTime required",
      });
    }

    const turf = await Turf.findById(turfId);
    if (!turf) {
      return res.status(404).json({ success: false, message: "Turf not found" });
    }

    // Slot already booked check (handle multi-slot booking ranges)
    const existingBookings = await Booking.find({
      turf: turfId,
      date,
      status: "booked",
    }).select("startTime endTime");

    const hasOverlap = existingBookings.some((booking) =>
      rangesOverlap(startTime, endTime, booking.startTime, booking.endTime)
    );

    if (hasOverlap) {
      return res.status(409).json({ success: false, message: "Slot already booked" });
    }

    // Calculate price based on duration
    const [sh, sm] = startTime.split(":").map(Number);
    const [eh, em] = endTime.split(":").map(Number);
    const durationHrs = ((eh * 60 + em) - (sh * 60 + sm)) / 60;
    const totalPrice = Math.round(turf.pricePerHour * durationHrs);
    const amountInPaise = totalPrice * 100;

    const receipt = `rcpt_${Date.now()}`;
    const rpOrder = await createRazorpayOrder({ amount: amountInPaise, receipt });

    // ✅ Player details ke saath booking save karo
    const booking = await Booking.create({
      user: req.user._id,
      turf: turfId,
      date,
      startTime,
      endTime,
      totalPrice,
      paymentStatus: "pending",
      status: "pending",
      orderId: rpOrder.id,
      playerName: playerName || null,        // ✅
      playerPhone: playerPhone || null,      // ✅
      players: Number(players) || 1,        // ✅
    });

    res.status(201).json({
      success: true,
      orderId: rpOrder.id,
      amount: rpOrder.amount,
      currency: rpOrder.currency,
      bookingId: booking._id,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error("Create Order Error:", error);
    next(error);
  }
};

// POST /api/payments/verify
const verifyPayment = async (req, res, next) => {
  try {
    const { orderId, paymentId, signature, bookingId } = req.body;

    if (!orderId || !paymentId || !signature || !bookingId) {
      return res.status(400).json({ success: false, message: "Missing fields" });
    }

    const isValid = verifyPaymentSignature(orderId, paymentId, signature);

    if (!isValid) {
      await Booking.findByIdAndUpdate(bookingId, {
        paymentStatus: "failed",
        paymentFailureReason: "Invalid signature",
      });
      return res.status(400).json({
        success: false,
        message: "Payment verification failed",
      });
    }

    const booking = await Booking.findByIdAndUpdate(
      bookingId,
      {
        paymentStatus: "paid",
        paymentId,
        razorpaySignature: signature,
        status: "booked",
      },
      { new: true }
    ).populate("turf", "name location pricePerHour");

    res.json({ success: true, message: "Payment verified", data: booking });
  } catch (error) {
    console.error("Verify Payment Error:", error);
    next(error);
  }
};

// POST /api/payments/failed
const handleFailedPayment = async (req, res, next) => {
  try {
    const { bookingId, reason } = req.body;

    if (!bookingId || bookingId === "null") {
      return res.status(400).json({ success: false, message: "bookingId required" });
    }

    const updated = await Booking.findByIdAndUpdate(
      bookingId,
      {
        paymentStatus: "failed",
        status: "cancelled",
        paymentFailureReason: reason || "Payment cancelled by user",
      },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    res.json({ success: true, message: "Payment failure recorded" });
  } catch (error) {
    next(error);
  }
};

// POST /api/payments/webhook
const handleWebhook = async (req, res, next) => {
  try {
    const receivedSig = req.headers["x-razorpay-signature"];

    if (!receivedSig) {
      return res.status(400).json({ message: "Signature missing" });
    }

    const isValid = verifyWebhookSignature(req.body, receivedSig);
    if (!isValid) {
      return res.status(400).json({ message: "Invalid webhook signature" });
    }

    const event = JSON.parse(req.body.toString());
    const { event: eventType, payload } = event;

    if (eventType === "payment.captured") {
      const { order_id, id: paymentId } = payload.payment.entity;
      await Booking.findOneAndUpdate(
        { orderId: order_id },
        { paymentStatus: "paid", paymentId, status: "booked" }
      );
    }

    if (eventType === "payment.failed") {
      const { order_id, error_description } = payload.payment.entity;
      await Booking.findOneAndUpdate(
        { orderId: order_id },
        {
          paymentStatus: "failed",
          status: "cancelled",
          paymentFailureReason: error_description,
        }
      );
    }

    res.json({ received: true });
  } catch (error) {
    console.error("Webhook Error:", error);
    next(error);
  }
};

module.exports = { createOrder, verifyPayment, handleFailedPayment, handleWebhook };