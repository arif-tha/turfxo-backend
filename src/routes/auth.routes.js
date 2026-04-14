const express = require("express");
const router = express.Router();

const { register, login } = require("../controllers/auth.controller");
const { protect } = require("../middleware/auth.middleware"); // ✅ FIXED PATH

const {
  registerValidation,
  loginValidation
} = require("../validations/auth.validation");

// 🔐 AUTH ROUTES
router.post("/register", registerValidation, register);
router.post("/login", loginValidation, login);

// ✅ GET CURRENT USER
router.get("/me", protect, (req, res) => {
  res.json({
    success: true,
    user: req.user,
  });
});

module.exports = router;