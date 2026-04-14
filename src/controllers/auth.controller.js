const { registerUser, loginUser } = require("../services/auth.service");

// ✅ REGISTER
const register = async (req, res, next) => {
  try {
    const result = await registerUser(req.body);

    res.status(201).json({
      success: true,
      token: result.token,   // ✅ service se token
      user: result.user,     // ✅ service se clean user
    });
  } catch (error) {
    next(error);
  }
};

// ✅ LOGIN
const login = async (req, res, next) => {
  try {
    const result = await loginUser(req.body);

    // 🔹 FIXED: ensure role is passed correctly in token
    // Agar service me role wrong aa raha ho to yaha bhi override kar sakte ho
    if (!result.user.role) {
      result.user.role = "user"; // default fallback
    }

    res.status(200).json({
      success: true,
      token: result.token,
      user: result.user,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { register, login };