const express = require("express");
const { requireAuth } = require("../middleware/auth.middleware");
const {
  getEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
} = require("../controllers/employees.controller");
const {
  getEmployeeNotes,
  addEmployeeNote,
} = require("../controllers/notes.controller");
getEmployeeNotes;
const router = express.Router();

router.use(requireAuth);

// IMPORTANT: notes routes must be before `/:id`
router.get("/:id/notes", getEmployeeNotes);
router.post("/:id/notes", addEmployeeNote);

router.get("/", getEmployees);
router.get("/:id", getEmployeeById);
router.post("/", createEmployee);
router.put("/:id", updateEmployee);
router.delete("/:id", deleteEmployee);

module.exports = router;
