const Slot = require("../models/Slot");
const Booking = require("../models/Booking");
const Turf = require("../models/Turf");

// ─────────────────────────────────────────
// 🔧 HELPERS
// ─────────────────────────────────────────

const timeToMinutes = (time) => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

const isTimeInRange = (time, start, end) => {
  const t = timeToMinutes(time);
  const s = timeToMinutes(start);
  const e = timeToMinutes(end);

  if (s < e) return t >= s && t < e;
  return t >= s || t < e;
};

const rangesOverlap = (startA, endA, startB, endB) => {
  return (
    isTimeInRange(startA, startB, endB) ||
    isTimeInRange(startB, startA, endA)
  );
};

// ✅ SAFE IST → UTC conversion
const getSlotStartUtcMs = (date, slotTime, openTime, closeTime) => {
  const [year, month, day] = date.split("-").map(Number);
  const [h, m] = slotTime.split(":").map(Number);

  const openMin = timeToMinutes(openTime);
  const closeMin = timeToMinutes(closeTime);
  const slotMin = h * 60 + m;

  const isOvernight = closeMin <= openMin;
  const isNextDay = isOvernight && slotMin < openMin;

  const slotDay = isNextDay ? day + 1 : day;

  // IST → UTC (minus 5:30)
  return Date.UTC(year, month - 1, slotDay, h, m) - (330 * 60 * 1000);
};

// ─────────────────────────────────────────
// 🔧 SLOT GENERATOR
// ─────────────────────────────────────────

const generateSlots = (openTime, closeTime, duration) => {
  const slots = [];

  let start = timeToMinutes(openTime);
  let end = timeToMinutes(closeTime);

  if (end <= start) end += 24 * 60;

  while (start + duration <= end) {
    const sH = Math.floor(start / 60) % 24;
    const sM = start % 60;

    const eTotal = start + duration;
    const eH = Math.floor(eTotal / 60) % 24;
    const eM = eTotal % 60;

    slots.push({
      startTime: `${String(sH).padStart(2, "0")}:${String(sM).padStart(2, "0")}`,
      endTime: `${String(eH).padStart(2, "0")}:${String(eM).padStart(2, "0")}`,
    });

    start += duration;
  }

  return slots;
};

// ─────────────────────────────────────────
// 📥 GET SLOTS
// ─────────────────────────────────────────

const getSlots = async (req, res) => {
  try {
    const { turfId, date } = req.query;

    if (!turfId || !date) {
      return res.status(400).json({
        success: false,
        message: "turfId and date required",
      });
    }

    const turf = await Turf.findById(turfId);
    if (!turf) {
      return res.status(404).json({
        success: false,
        message: "Turf not found",
      });
    }

    const openTime = turf.openTime || "06:00";
    const closeTime = turf.closeTime || "03:00";
    const duration = turf.slotDuration || 60;

    const generatedSlots = generateSlots(openTime, closeTime, duration);

    // ✅ booked slots
    const bookedSlots = await Booking.find({
      turf: turfId,
      date,
      status: "booked",
    }).select("startTime endTime");

    // ✅ CURRENT TIME (PURE UTC)
    const nowUtc = Date.now();

    // ✅ requested date midnight UTC
    const [y, m, d] = date.split("-").map(Number);
    const requestedMidnightUtc = Date.UTC(y, m - 1, d);

    // ✅ today's midnight UTC
    const now = new Date();
    const todayMidnightUtc = Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate()
    );

    const isDatePast = requestedMidnightUtc < todayMidnightUtc;

    const slots = generatedSlots.map((slot) => {
      const slotUtc = getSlotStartUtcMs(
        date,
        slot.startTime,
        openTime,
        closeTime
      );

      // ✅ FIXED: correct past logic
      const isPast = isDatePast || slotUtc < nowUtc;

      const slotMin = timeToMinutes(slot.startTime);
      const openMin = timeToMinutes(openTime);
      const closeMin = timeToMinutes(closeTime);

      const isOvernight = closeMin <= openMin;
      const isNextDay = isOvernight && slotMin < openMin;

      const isBooked = bookedSlots.some((b) =>
        rangesOverlap(
          slot.startTime,
          slot.endTime,
          b.startTime,
          b.endTime
        )
      );

      return {
        startTime: slot.startTime,
        endTime: slot.endTime,
        isBooked,
        isPast,
        isNextDay,
      };
    });

    return res.json({
      success: true,
      date,
      turfId,
      count: slots.length,
      data: slots,
    });

  } catch (err) {
    console.error("Get Slots Error:", err);
    return res.status(500).json({
      success: false,
      message: "Error fetching slots",
    });
  }
};

// ─────────────────────────────────────────
// ➕ CREATE SLOT
// ─────────────────────────────────────────

const createSlot = async (req, res) => {
  try {
    const { turf, date, startTime, endTime } = req.body;

    if (!turf || !date || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: "All fields required",
      });
    }

    const exists = await Slot.findOne({ turf, date, startTime, endTime });
    if (exists) {
      return res.status(400).json({
        success: false,
        message: "Slot already exists",
      });
    }

    const slot = await Slot.create({ turf, date, startTime, endTime });

    res.status(201).json({
      success: true,
      message: "Slot created",
      data: slot,
    });

  } catch {
    res.status(500).json({
      success: false,
      message: "Error creating slot",
    });
  }
};

// ─────────────────────────────────────────
// 🔒 BOOK SLOT
// ─────────────────────────────────────────

const bookSlot = async (req, res) => {
  try {
    const { id } = req.params;

    const slot = await Slot.findById(id);
    if (!slot) {
      return res.status(404).json({
        success: false,
        message: "Slot not found",
      });
    }

    if (slot.isBooked) {
      return res.status(400).json({
        success: false,
        message: "Already booked",
      });
    }

    slot.isBooked = true;
    await slot.save();

    const booking = await Booking.create({
      user: req.user.id,
      turf: slot.turf,
      slot: slot._id,
      totalPrice: 500,
    });

    res.json({
      success: true,
      message: "Booked",
      data: booking,
    });

  } catch {
    res.status(500).json({
      success: false,
      message: "Error booking",
    });
  }
};

module.exports = {
  getSlots,
  createSlot,
  bookSlot,
};