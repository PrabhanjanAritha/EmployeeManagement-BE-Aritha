const express = require("express");
const { requireAuth } = require("../middleware/auth.middleware");
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
router.post("/:id/notes", addEmployeeNote);

// ============================================
// STATUS TOGGLE - Must come BEFORE /:id route
// ============================================
router.patch("/:id/toggle-status", toggleEmployeeStatus);

// ============================================
// MAIN EMPLOYEE CRUD ROUTES
// ============================================
router.get("/", getEmployees);
router.get("/:id", getEmployeeById);
router.post("/", createEmployee);
router.put("/:id", updateEmployee);
router.delete("/:id", deleteEmployee);

module.exports = router;
