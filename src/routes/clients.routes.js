const express = require("express");
const {
  requireAuth,
  requireAdminEdit,
} = require("../middleware/auth.middleware");
const {
  getClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient,
  getClientTeams,
  getClientEmployees,
} = require("../controllers/clients.controller");

const router = express.Router();

// Apply authentication to all routes
router.use(requireAuth);

// Get client teams - Must come BEFORE /:id
router.get("/:id/teams", getClientTeams);

// Get client employees - Must come BEFORE /:id
router.get("/:id/employees", getClientEmployees);

// Main CRUD routes
router.get("/", getClients);
router.get("/:id", getClientById);
router.post("/", requireAdminEdit, createClient);
router.put("/:id", requireAdminEdit, updateClient);
router.delete("/:id", requireAdminEdit, deleteClient);

module.exports = router;
