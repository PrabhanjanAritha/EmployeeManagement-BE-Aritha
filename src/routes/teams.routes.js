const express = require("express");
const { requireAuth } = require("../middleware/auth.middleware");
const {
  getTeams,
  getTeamById,
  createTeam,
  updateTeam,
  deleteTeam,
} = require("../controllers/teams.controller");

const router = express.Router();

router.use(requireAuth);

router.get("/", getTeams);
router.get("/:id", getTeamById);
router.post("/", createTeam);
router.put("/:id", updateTeam);
router.delete("/:id", deleteTeam);

module.exports = router;
