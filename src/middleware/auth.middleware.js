const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../config/env");
const ApiError = require("../utils/ApiError");
const User = require("../models/User");

// 🔒 PROTECT ROUTES
const protect = async (req, res, next) => {
  let token;

  try {
    // 1️⃣ Check for token in headers
    if (req.headers.authorization?.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return next(new ApiError(401, "Not authorized, token missing"));
    }

    if (!JWT_SECRET) {
      throw new ApiError(500, "JWT_SECRET missing in environment variables");
    }

    // 2️⃣ Verify token
    const decoded = jwt.verify(token, JWT_SECRET);

    // 3️⃣ Fetch full user
    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      return next(new ApiError(401, "User not found"));
    }

    req.user = user; // attach user to request

    next();
  } catch (error) {
    console.error("Protect Middleware Error:", error.message);
    return next(new ApiError(401, "Invalid or expired token"));
  }
};

// 🛡 ROLE-BASED AUTHORIZATION
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError(401, "User not logged in"));
    }

    if (!roles.includes(req.user.role)) {
      console.log(`Access denied for role: ${req.user.role}`);
      return next(
        new ApiError(403, `Access denied: only ${roles.join(", ")} can access`)
      );
    }

    next();
  };
};

module.exports = { protect, authorize };