async function getTeams(req, res) {
  const prisma = req.prisma;
  try {
    const teams = await prisma.team.findMany({
      include: { employees: true },
    });
    res.json(teams);
  } catch (err) {
    console.error("getTeams error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
}

async function getTeamById(req, res) {
  const prisma = req.prisma;
  const id = Number(req.params.id);

  try {
    const team = await prisma.team.findUnique({
      where: { id },
      include: { employees: true },
    });

    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }

    res.json(team);
  } catch (err) {
    console.error("getTeamById error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
}

async function createTeam(req, res) {
  const prisma = req.prisma;
  try {
    const { name } = req.body;

    const team = await prisma.team.create({
      data: { name },
    });

    res.status(201).json(team);
  } catch (err) {
    console.error("createTeam error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
}

async function updateTeam(req, res) {
  const prisma = req.prisma;
  const id = Number(req.params.id);

  try {
    const { name } = req.body;

    const team = await prisma.team.update({
      where: { id },
      data: { name },
    });

    res.json(team);
  } catch (err) {
    console.error("updateTeam error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
}

async function deleteTeam(req, res) {
  const prisma = req.prisma;
  const id = Number(req.params.id);

  try {
    await prisma.team.delete({ where: { id } });
    res.status(204).send();
  } catch (err) {
    console.error("deleteTeam error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
}

module.exports = {
  getTeams,
  getTeamById,
  createTeam,
  updateTeam,
  deleteTeam,
};
