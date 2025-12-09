const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const BCRYPT_SALT_ROUNDS = 12;
const ADMIN_EMAIL = "admin@arithaconsulting.com";

async function register(req, res) {
  const prisma = req.prisma;

  try {
    const { email, password, role } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }
    // // ✅ CHECK IF USER IS ACTIVE
    // if (!user.active) {
    //   return res.status(403).json({
    //     message:
    //       "Your account has been deactivated. Please contact the administrator.",
    //   });
    // }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ message: "User already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: role || "hr",
      },
    });

    res.status(201).json({
      id: user.id,
      email: user.email,
      role: user.role,
    });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
}

async function login(req, res) {
  const prisma = req.prisma;

  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }
    // ✅ CHECK IF USER IS ACTIVE
    if (!user.active) {
      return res.status(403).json({
        message:
          "Your account has been deactivated. Please contact the administrator.",
      });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        // first_name: user.first_name,
        // last_name: user.last_name,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        // first_name: user.first_name,
        // last_name: user.last_name,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
}
// HELPER FUNCTIONS
// ============================================

async function getAdminUser() {
  return prisma.user.findUnique({
    where: { email: ADMIN_EMAIL },
  });
}

function isAdminUser(req) {
  return req.user && req.user.email === ADMIN_EMAIL;
}

// ============================================
// 1. SET RECOVERY ANSWER (When Logged In)
// ============================================
/**
 * POST /api/user/set-recovery-answer
 * Logged-in TN-Admin sets or updates the recovery answer
 * Body: { answer: string }
 */
async function setRecoveryAnswer(req, res) {
  try {
    if (!isAdminUser(req)) {
      return res.status(403).json({ error: "Forbidden: Admin access only" });
    }

    const { answer } = req.body;

    // Validate answer
    if (!answer || typeof answer !== "string") {
      return res.status(400).json({ error: "Recovery answer is required" });
    }

    const trimmedAnswer = answer.trim();
    if (trimmedAnswer.length < 3) {
      return res.status(400).json({
        error: "Recovery answer must be at least 3 characters",
      });
    }

    // Hash the answer
    const hash = await bcrypt.hash(trimmedAnswer, BCRYPT_SALT_ROUNDS);

    // Update user record
    await prisma.user.update({
      where: { email: ADMIN_EMAIL },
      data: { recoveryAnswerHash: hash },
    });

    return res.json({
      success: true,
      message: "Recovery answer saved successfully.",
    });
  } catch (err) {
    console.error("setRecoveryAnswer error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}

// ============================================
// 2. UPDATE RECOVERY ANSWER (When Logged In)
// ============================================
/**
 * POST /api/user/update-recovery-answer
 * Logged-in TN-Admin updates recovery answer by providing the old one
 * Body: { oldAnswer: string, newAnswer: string }
 */
async function updateRecoveryAnswer(req, res) {
  try {
    if (!isAdminUser(req)) {
      return res.status(403).json({ error: "Forbidden: Admin access only" });
    }

    const { oldAnswer, newAnswer } = req.body;

    // Validate inputs
    if (!oldAnswer || !newAnswer) {
      return res.status(400).json({
        error: "Both old and new recovery answers are required",
      });
    }

    const trimmedNewAnswer = newAnswer.trim();
    if (trimmedNewAnswer.length < 3) {
      return res.status(400).json({
        error: "New recovery answer must be at least 3 characters",
      });
    }

    // Get admin user
    const admin = await getAdminUser();
    if (!admin) {
      return res.status(404).json({ error: "Admin account not found" });
    }

    // Check if recovery answer is set
    if (!admin.recoveryAnswerHash) {
      return res.status(400).json({
        error: "No recovery answer is currently set",
      });
    }

    // Verify old answer
    const isOldAnswerValid = await bcrypt.compare(
      oldAnswer.trim(),
      admin.recoveryAnswerHash
    );

    if (!isOldAnswerValid) {
      return res.status(401).json({
        error: "Old recovery answer is incorrect",
      });
    }

    // Hash new answer
    const newHash = await bcrypt.hash(trimmedNewAnswer, BCRYPT_SALT_ROUNDS);

    // Update user record
    await prisma.user.update({
      where: { email: ADMIN_EMAIL },
      data: { recoveryAnswerHash: newHash },
    });

    return res.json({
      success: true,
      message: "Recovery answer updated successfully.",
    });
  } catch (err) {
    console.error("updateRecoveryAnswer error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}

// ============================================
// 3. CHECK IF RECOVERY IS CONFIGURED
// ============================================
/**
 * GET /api/user/recovery-configured
 * Public endpoint to check if admin has recovery configured
 * Returns: { configured: boolean }
 */
async function checkRecoveryConfigured(req, res) {
  try {
    const admin = await getAdminUser();

    const configured = !!(admin && admin.recoveryAnswerHash);

    return res.json({ configured });
  } catch (err) {
    console.error("checkRecoveryConfigured error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}

// ============================================
// 4. RESET PASSWORD USING RECOVERY ANSWER (When Logged Out)
// ============================================
/**
 * POST /api/user/reset-admin-password
 * Forgot-password flow for TN-Admin using recovery answer
 * Body: { answer: string, newPassword: string }
 *
 * IMPORTANT: This endpoint should be:
 * - Rate-limited (e.g., max 5 attempts per hour per IP)
 * - Protected by CAPTCHA
 * - Monitored for suspicious activity
 */
async function resetAdminPassword(req, res) {
  try {
    const { answer, newPassword } = req.body;

    // Validate inputs
    if (!answer || !newPassword) {
      return res.status(400).json({
        error: "Recovery answer and new password are required",
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        error: "New password must be at least 8 characters",
      });
    }

    // Get admin user
    const admin = await getAdminUser();
    if (!admin) {
      return res.status(404).json({ error: "Admin account not found" });
    }

    // Check if recovery is configured
    if (!admin.recoveryAnswerHash) {
      return res.status(400).json({
        error: "Password recovery is not configured. Please contact support.",
      });
    }

    // Verify recovery answer
    const isAnswerValid = await bcrypt.compare(
      answer.trim(),
      admin.recoveryAnswerHash
    );

    if (!isAnswerValid) {
      // Generic error message to prevent enumeration
      return res.status(401).json({
        error: "Invalid recovery credentials",
      });
    }

    // Hash new password
    const newHash = await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS);

    // Update password
    await prisma.user.update({
      where: { email: ADMIN_EMAIL },
      data: { passwordHash: newHash },
    });

    // Optional: Log this security event
    console.log(
      `Admin password reset via recovery answer at ${new Date().toISOString()}`
    );

    // Optional: Invalidate all existing sessions/tokens for this user
    // This would require additional session management implementation

    return res.json({
      success: true,
      message:
        "Password reset successful. You can now login with your new password.",
    });
  } catch (err) {
    console.error("resetAdminPassword error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}

// ============================================
// 5. CHANGE PASSWORD (When Logged In)
// ============================================
/**
 * POST /api/user/change-password
 * Logged-in TN-Admin changes password by providing current password
 * Body: { currentPassword: string, newPassword: string }
 */
async function changePassword(req, res) {
  try {
    if (!isAdminUser(req)) {
      return res.status(403).json({ error: "Forbidden: Admin access only" });
    }

    const { currentPassword, newPassword } = req.body;

    // Validate inputs
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: "Current password and new password are required",
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        error: "New password must be at least 8 characters",
      });
    }

    // Get admin user
    const admin = await getAdminUser();
    if (!admin) {
      return res.status(404).json({ error: "Admin account not found" });
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      admin.passwordHash
    );

    if (!isCurrentPasswordValid) {
      return res.status(401).json({
        error: "Current password is incorrect",
      });
    }

    // Hash new password
    const newHash = await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS);

    // Update password
    await prisma.user.update({
      where: { email: ADMIN_EMAIL },
      data: { passwordHash: newHash },
    });

    // Optional: Log security event
    console.log(`Admin password changed at ${new Date().toISOString()}`);

    return res.json({
      success: true,
      message: "Password updated successfully.",
    });
  } catch (err) {
    console.error("changePassword error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}

module.exports = {
  register,
  login,
  changePassword,
  resetAdminPassword,
  setRecoveryAnswer,
};
