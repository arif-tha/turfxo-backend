const User = require("../models/User");
const ApiError = require("../utils/ApiError");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { JWT_SECRET, JWT_EXPIRE } = require("../config/env");

// 🔥 GENERATE TOKEN FUNCTION (SAFE)
const generateToken = (user) => {
  if (!JWT_SECRET) {
    throw new ApiError(500, "JWT_SECRET is not defined in environment variables");
  }

  return jwt.sign(
    {
      id: user._id,
      role: user.role || "user", // fallback only if missing
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRE || "7d" }
  );
};

// ✅ REGISTER USER
const registerUser = async (data) => {
  const { name, email, password, role } = data;

  if (!name || !email || !password) {
    throw new ApiError(400, "All fields are required");
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new ApiError(400, "User already exists");
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await User.create({
    name,
    email,
    password: hashedPassword,
    role: role || "user", // allow admin creation if role provided
  });

  const token = generateToken(user);

  return {
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
};

// ✅ LOGIN USER
const loginUser = async (data) => {
  const { email, password } = data;

  if (!email || !password) {
    throw new ApiError(400, "Email and password are required");
  }

  const user = await User.findOne({ email });
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new ApiError(401, "Invalid credentials");
  }

  const token = generateToken(user);

  return {
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
};

module.exports = { registerUser, loginUser };