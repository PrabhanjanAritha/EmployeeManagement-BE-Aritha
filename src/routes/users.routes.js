// routes/users.routes.js
const express = require("express");
const { requireAuth, requireAdmin } = require("../middleware/auth.middleware");
const {
  getUsers,
  getUserById,
  updateUserStatus,
  updateUserRole,
  deleteUser,
} = require("../controllers/users.controller");

const router = express.Router();

// All routes require authentication
router.use(requireAuth);

// All routes require admin role
router.use(requireAdmin);

router.get("/", getUsers);
router.get("/:id", getUserById);
router.patch("/:id/status", updateUserStatus);
router.patch("/:id/role", updateUserRole);
router.delete("/:id", deleteUser);

module.exports = router;
