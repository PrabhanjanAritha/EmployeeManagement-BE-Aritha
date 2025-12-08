// routes/teams.routes.js
const express = require("express");
const {
  requireAuth,
  requireAdminEdit,
} = require("../middleware/auth.middleware");
const {
  getTeams,
  getTeamById,
  createTeam,
  updateTeam,
  deleteTeam,
  getTeamEmployees,
} = require("../controllers/teams.controller");

const router = express.Router();

// Apply authentication to all routes
router.use(requireAuth);

// Get team employees - Must come BEFORE /:id
router.get("/:id/employees", getTeamEmployees);

// Main CRUD routes
router.get("/", getTeams);
router.get("/:id", getTeamById);
router.post("/", requireAdminEdit, createTeam);
router.put("/:id", requireAdminEdit, updateTeam);
router.delete("/:id", requireAdminEdit, deleteTeam);

module.exports = router;
