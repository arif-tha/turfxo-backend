const express = require("express");
const router = express.Router();

const {
  createTurf,
  getTurfs
} = require("../controllers/turf.controller");

const { protect, authorize } = require("../middleware/auth.middleware");
const Turf = require("../models/Turf");

// ✅ Public - ALL TURFS
router.get("/", getTurfs);

// ✅ Public - SINGLE TURF
router.get("/:id", async (req, res) => {
  try {
    const turf = await Turf.findById(req.params.id);
    if (!turf) return res.status(404).json({ success: false, message: "Turf not found" });
    res.json({ success: true, data: turf });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ✅ Admin only - CREATE
router.post("/", protect, authorize("admin"), createTurf);

// ✅ NEW — Admin only - UPDATE TURF (slot config ke liye)
router.put("/:id", protect, authorize("admin"), async (req, res) => {
  try {
    const turf = await Turf.findByIdAndUpdate(
      req.params.id,
      { ...req.body },
      { new: true, runValidators: true }
    );
    if (!turf) return res.status(404).json({ success: false, message: "Turf not found" });
    res.json({ success: true, data: turf });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ✅ NEW — Admin only - DELETE TURF
router.delete("/:id", protect, authorize("admin"), async (req, res) => {
  try {
    await Turf.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Turf deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;