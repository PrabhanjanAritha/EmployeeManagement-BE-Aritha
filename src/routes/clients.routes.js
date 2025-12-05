const express = require("express");
const { requireAuth } = require("../middleware/auth.middleware");
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
router.post("/", createClient);
router.put("/:id", updateClient);
router.delete("/:id", deleteClient);

module.exports = router;
