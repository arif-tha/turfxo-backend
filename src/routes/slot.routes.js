const express = require("express");

const {
  createSlot,
  getSlots,
  bookSlot,
} = require("../controllers/slotController");

const { protect, authorize } = require("../middleware/auth.middleware"); // 🔥 ADD authorize

const router = express.Router();

// ➕ CREATE SLOT (ADMIN ONLY - future ready)
router.post("/", protect, authorize("admin"), createSlot);

// 📥 GET SLOTS (PUBLIC)
router.get("/", getSlots);

// 🔒 BOOK SLOT (USER ONLY)
router.put("/book/:id", protect, authorize("user", "admin"), bookSlot);

module.exports = router;