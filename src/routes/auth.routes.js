const express = require("express");
const rateLimit = require("express-rate-limit");

const {
  register,
  login,
  setRecoveryAnswer,
  updateRecoveryAnswer,
  resetAdminPassword,
  changePassword,
} = require("../controllers/auth.controller");

// Import your authentication middleware
const { authenticateToken } = require("../middleware/auth.middleware"); // Adjust path as needed

const router = express.Router();

// ============================================
// RATE LIMITING
// ============================================

// Rate limiter for password reset (public endpoint)
const resetPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Max 5 attempts per hour per IP
  message: {
    error: "Too many password reset attempts. Please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for recovery answer operations
const recoveryAnswerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Max 10 attempts
  message: {
    error: "Too many requests. Please try again later.",
  },
});

// Rate limiter for login attempts
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Max 10 login attempts
  message: {
    error: "Too many login attempts. Please try again later.",
  },
});

// ============================================
// PUBLIC ROUTES (No authentication required)
// ============================================

// Register a new user
router.post("/register", register);

// Login
router.post("/login", loginLimiter, login);

// Reset admin password using recovery answer (FORGOT PASSWORD)
router.post("/reset-admin-password", resetPasswordLimiter, resetAdminPassword);

// ============================================
// PROTECTED ROUTES (Authentication required)
// ============================================

// Set recovery answer (first time or overwrite)
router.post(
  "/set-recovery-answer",
  authenticateToken,
  recoveryAnswerLimiter,
  setRecoveryAnswer
);

// Update recovery answer (requires old answer)
router.post(
  "/update-recovery-answer",
  authenticateToken,
  recoveryAnswerLimiter,
  updateRecoveryAnswer
);

// Change password (requires current password)
router.post("/change-password", authenticateToken, changePassword);

module.exports = router;
