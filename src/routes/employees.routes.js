const express = require("express");
const {
  requireAuth,
  requireAdminEdit,
} = require("../middleware/auth.middleware");
const {
  getEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  toggleEmployeeStatus, // ✅ NEW
  getEmployeeStats, // ✅ NEW
} = require("../controllers/employees.controller");

const {
  getEmployeeNotes,
  addEmployeeNote,
} = require("../controllers/notes.controller");

const router = express.Router();

// Apply authentication to all routes
router.use(requireAuth);

// ============================================
// STATS ROUTE - Must come BEFORE /:id routes
// ============================================
router.get("/stats", getEmployeeStats);

// ============================================
// NOTES ROUTES - Must come BEFORE /:id route
// ============================================
router.get("/:id/notes", getEmployeeNotes);
router.post("/:id/notes", requireAdminEdit, addEmployeeNote);

// ============================================
// STATUS TOGGLE - Must come BEFORE /:id route
// ============================================
router.patch("/:id/toggle-status", requireAdminEdit, toggleEmployeeStatus);

// ============================================
// MAIN EMPLOYEE CRUD ROUTES
// ============================================
router.get("/", getEmployees);
router.get("/:id", getEmployeeById);
router.post("/", requireAdminEdit, createEmployee);
router.put("/:id", requireAdminEdit, updateEmployee);
router.delete("/:id", requireAdminEdit, deleteEmployee);

module.exports = router;
