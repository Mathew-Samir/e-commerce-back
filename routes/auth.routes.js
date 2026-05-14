const express = require("express");
const {
  register,
  login,
  updateProfile,
  changePassword,
  logout,
  getProfile,
} = require("../controllers/auth.controller");
const protect = require("../middlewares/auth.middleware");
const rateLimiter = require("../middlewares/rateLimit.middleware");

const router = express.Router();

const authRateLimit = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 requests per 15 minutes
  message: "Too many attempts from this IP, please try again after 15 minutes",
});

router.post("/register", authRateLimit, register);
router.post("/login", authRateLimit, login);
router.post("/logout", protect, logout);
router.get("/profile", protect, getProfile);
router.put("/profile", protect, updateProfile);
router.put("/change-password", protect, authRateLimit, changePassword);

module.exports = router;
