const Slot = require("../models/Slot");
const Booking = require("../models/Booking");
const Turf = require("../models/Turf");

// ─────────────────────────────────────────
// 🔧 HELPER — Generate time slots
// ─────────────────────────────────────────
const generateSlots = (openTime, closeTime, durationMinutes, date) => {
  const slots = [];
  const [openH, openM] = openTime.split(":").map(Number);
  const [closeH, closeM] = closeTime.split(":").map(Number);

  let current = openH * 60 + openM;
  const end = closeH * 60 + closeM;

  while (current + durationMinutes <= end) {
    const startH = String(Math.floor(current / 60)).padStart(2, "0");
    const startMin = String(current % 60).padStart(2, "0");
    const endMin = current + durationMinutes;
    const endH = String(Math.floor(endMin / 60)).padStart(2, "0");
    const endMinStr = String(endMin % 60).padStart(2, "0");

    slots.push({
      startTime: `${startH}:${startMin}`,
      endTime: `${endH}:${endMinStr}`
    });

    current += durationMinutes;
  }

  return slots;
};

// ─────────────────────────────────────────
// 📥 GET SLOTS — Dynamic generation
// GET /api/slots?turfId=xxx&date=2025-07-15
// ─────────────────────────────────────────
const getSlots = async (req, res) => {
  try {
    const { turfId, date } = req.query;

    if (!turfId || !date) {
      return res.status(400).json({
        success: false,
        message: "turfId and date are required"
      });
    }

    // 1. Turf fetch karo
    const turf = await Turf.findById(turfId);
    if (!turf) {
      return res.status(404).json({ success: false, message: "Turf not found" });
    }

    // 2. Slots generate karo
    const generatedSlots = generateSlots(
      turf.openTime || "06:00",
      turf.closeTime || "22:00",
      turf.slotDuration || 60,
      date
    );

    // 3. Us date ke booked slots fetch karo
    const bookedSlots = await Booking.find({
      turf: turfId,
      date,
      status: "booked"
    }).select("startTime endTime");

    const bookedTimes = new Set(bookedSlots.map(b => b.startTime));

    // 4. Har slot ko available/booked mark karo
    //    Past slots bhi disable karo (aaj ki date ke liye)
    const today = new Date().toISOString().split("T")[0];
    const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();

    const slots = generatedSlots.map(slot => {
      const isPast =
        date === today &&
        slot.startTime.split(":").reduce((h, m) => +h * 60 + +m, 0) <= nowMinutes;

      return {
        startTime: slot.startTime,
        endTime: slot.endTime,
        isBooked: bookedTimes.has(slot.startTime),
        isPast
      };
    });

    return res.status(200).json({
      success: true,
      date,
      turfId,
      count: slots.length,
      data: slots
    });
  } catch (err) {
    console.error("Get Slots Error:", err);
    return res.status(500).json({ success: false, message: "Error fetching slots" });
  }
};

// ➕ CREATE SLOT — Purana code, touch nahi kiya (admin ke liye)
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

// 🔒 BOOK SLOT — Purana code rakha (legacy support)
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
      totalPrice: 500
    });
    return res.status(200).json({ success: true, message: "Slot booked", data: booking });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Error booking slot" });
  }
};

module.exports = { createSlot, getSlots, bookSlot };