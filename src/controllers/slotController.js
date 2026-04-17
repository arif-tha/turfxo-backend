const Slot = require("../models/Slot");
const Booking = require("../models/Booking");
const Turf = require("../models/Turf");

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

// ─────────────────────────────────────────
// 🔧 HELPER — Generate slots (supports overnight: e.g. 06:00 to 03:00 next day)
// ─────────────────────────────────────────
const generateSlots = (openTime, closeTime, durationMinutes, date) => {
  const slots = [];
  const [openH, openM] = openTime.split(":").map(Number);
  const [closeH, closeM] = closeTime.split(":").map(Number);

  let current = openH * 60 + openM;

  // ✅ Overnight support: agar closeTime < openTime, add 24hrs to close
  let end = closeH * 60 + closeM;
  if (end <= current) end += 24 * 60; // e.g. 03:00 = 180 → 180 + 1440 = 1620

  while (current + durationMinutes <= end) {
    const startH = Math.floor(current / 60) % 24;
    const startMin = current % 60;
    const endTotal = current + durationMinutes;
    const endH = Math.floor(endTotal / 60) % 24;
    const endMin = endTotal % 60;

    slots.push({
      startTime: `${String(startH).padStart(2, "0")}:${String(startMin).padStart(2, "0")}`,
      endTime: `${String(endH).padStart(2, "0")}:${String(endMin).padStart(2, "0")}`,
    });

    current += durationMinutes;
  }

  return slots;
};

// ─────────────────────────────────────────
// 📥 GET SLOTS
// GET /api/slots?turfId=xxx&date=2025-07-15
// ─────────────────────────────────────────
const getSlots = async (req, res) => {
  try {
    const { turfId, date } = req.query;

    if (!turfId || !date) {
      return res.status(400).json({
        success: false,
        message: "turfId and date are required",
      });
    }

    const turf = await Turf.findById(turfId);
    if (!turf) {
      return res.status(404).json({ success: false, message: "Turf not found" });
    }

    const generatedSlots = generateSlots(
      turf.openTime || "06:00",
      turf.closeTime || "03:00", // ✅ Default 3am next day
      turf.slotDuration || 60,
      date
    );

    // Booked slots
    const bookedSlots = await Booking.find({
      turf: turfId,
      date,
      status: "booked",
    }).select("startTime endTime");

    // ✅ Live time expiry — IST aware
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istNow = new Date(now.getTime() + istOffset);
    const todayIST = istNow.toISOString().split("T")[0];
    const nowMinutes = istNow.getUTCHours() * 60 + istNow.getUTCMinutes();

    const slots = generatedSlots.map((slot) => {
      const [sh, sm] = slot.startTime.split(":").map(Number);
      const slotMinutes = sh * 60 + sm;

      // ✅ Overnight slots (e.g. 00:00-03:00) are after midnight
      // For today, past = slotMinutes <= nowMinutes (normal slots)
      // For overnight slots (sh < 6), they are "next day" morning — not past today
      let isPast = false;
      if (date === todayIST) {
        const isOvernightSlot = sh < 6;
        if (!isOvernightSlot) {
          isPast = slotMinutes <= nowMinutes;
        }
      }

      const isBooked = bookedSlots.some((booking) =>
        rangesOverlap(slot.startTime, slot.endTime, booking.startTime, booking.endTime)
      );

      return {
        startTime: slot.startTime,
        endTime: slot.endTime,
        isBooked,
        isPast,
      };
    });

    return res.status(200).json({
      success: true,
      date,
      turfId,
      count: slots.length,
      data: slots,
    });
  } catch (err) {
    console.error("Get Slots Error:", err);
    return res.status(500).json({ success: false, message: "Error fetching slots" });
  }
};

// ➕ CREATE SLOT (admin)
const createSlot = async (req, res) => {
  try {
    const { turf, date, startTime, endTime } = req.body;
    if (!turf || !date || !startTime || !endTime) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }
    const existing = await Slot.findOne({ turf, date, startTime, endTime });
    if (existing) {
      return res.status(400).json({ success: false, message: "Slot already exists" });
    }
    const slot = await Slot.create({ turf, date, startTime, endTime });
    return res.status(201).json({ success: true, message: "Slot created successfully", data: slot });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Error creating slot" });
  }
};

// 🔒 BOOK SLOT (legacy)
const bookSlot = async (req, res) => {
  try {
    const { id } = req.params;
    const slot = await Slot.findById(id);
    if (!slot) return res.status(404).json({ success: false, message: "Slot not found" });
    if (slot.isBooked) return res.status(400).json({ success: false, message: "Slot already booked" });
    slot.isBooked = true;
    await slot.save();
    const booking = await Booking.create({
      user: req.user.id,
      turf: slot.turf,
      slot: slot._id,
      totalPrice: 500,
    });
    return res.status(200).json({ success: true, message: "Slot booked", data: booking });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Error booking slot" });
  }
};

module.exports = { createSlot, getSlots, bookSlot };