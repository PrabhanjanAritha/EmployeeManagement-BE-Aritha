const express = require("express");
const { requireAuth } = require("../middleware/auth.middleware");
const {
  getClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient,
} = require("../controllers/clients.controller");

const router = express.Router();

router.use(requireAuth);

router.get("/", getClients);
router.get("/:id", getClientById);
router.post("/", createClient);
router.put("/:id", updateClient);
router.delete("/:id", deleteClient);

module.exports = router;
