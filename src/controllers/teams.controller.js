// controllers/teams.controller.js

/**
 * GET /api/teams
 * Get all teams with optional filters
 */
async function getTeams(req, res) {
  const prisma = req.prisma;

  try {
    const {
      clientId,
      search,
      includeEmployees,
      page = "1",
      pageSize = "20",
      sortBy = "name",
      sortOrder = "asc",
    } = req.query;

    // Pagination
    const pageNum = Math.max(1, Number(page) || 1);
    const sizeNum = Math.min(200, Math.max(1, Number(pageSize) || 20)); // allow up to 200
    const skip = (pageNum - 1) * sizeNum;

    // Build base where
    const where = {};

    // Client filter: accept numeric id or fallback to client name string
    if (clientId) {
      const clientIdNum = Number(clientId);
      if (!Number.isNaN(clientIdNum)) {
        where.clientId = clientIdNum;
      } else {
        // treat clientId as a name
        where.client = {
          name: { contains: String(clientId).trim(), mode: "insensitive" },
        };
      }
    }

    // Search by team fields
    if (search && search.trim()) {
      const s = search.trim();
      where.OR = [
        { name: { contains: s, mode: "insensitive" } },
        { title: { contains: s, mode: "insensitive" } },
        { managerName: { contains: s, mode: "insensitive" } },
        { managerEmail: { contains: s, mode: "insensitive" } },
        { client: { name: { contains: s, mode: "insensitive" } } }, // optionally search by client name
      ];
    }

    // Sorting - allowlist for safety
    const validSortFields = ["name", "title", "managerName", "createdAt"];
    const orderByField = validSortFields.includes(String(sortBy))
      ? String(sortBy)
      : "name";
    const orderByDirection =
      String(sortOrder).toLowerCase() === "desc" ? "desc" : "asc";

    // Build include
    const include = {
      client: {
        select: {
          id: true,
          name: true,
          pocInternalName: true,
          pocInternalEmail: true,
        },
      },
      employees:
        includeEmployees === "true"
          ? {
              where: { active: true },
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                title: true,
              },
            }
          : false,
      _count: {
        select: { employees: true },
      },
    };

    // Parallel queries for data + total
    const [teams, total] = await Promise.all([
      prisma.team.findMany({
        where,
        include,
        orderBy: { [orderByField]: orderByDirection },
        skip,
        take: sizeNum,
      }),
      prisma.team.count({ where }),
    ]);

    const totalPages = Math.ceil(total / sizeNum);

    res.json({
      success: true,
      data: teams,
      pagination: {
        total,
        page: pageNum,
        pageSize: sizeNum,
        totalPages,
        hasMore: pageNum < totalPages,
      },
    });
  } catch (err) {
    console.error("getTeams error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch teams",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
}

/**
 * GET /api/teams/:id
 * Get a single team by ID with full details
 */
async function getTeamById(req, res) {
  const prisma = req.prisma;
  const id = Number(req.params.id);

  if (isNaN(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid team ID",
    });
  }

  try {
    const team = await prisma.team.findUnique({
      where: { id },
      include: {
        client: true,
        employees: {
          where: { active: true },
          select: {
            id: true,
            employeeCode: true,
            firstName: true,
            lastName: true,
            email: true,
            title: true,
            dateOfJoining: true,
          },
          orderBy: { firstName: "asc" },
        },
        _count: {
          select: {
            employees: true,
          },
        },
      },
    });

    if (!team) {
      return res.status(404).json({
        success: false,
        message: "Team not found",
      });
    }

    res.json({
      success: true,
      data: team,
    });
  } catch (err) {
    console.error("getTeamById error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch team",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
}

/**
 * POST /api/teams
 * Create a new team
 */
async function createTeam(req, res) {
  const prisma = req.prisma;

  try {
    const {
      name,
      title,
      managerName,
      managerEmail,
      clientId,
      employeeIds, // Array of employee IDs to associate
    } = req.body;

    // Validation
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Team name is required",
      });
    }

    // Validate manager email if provided
    if (managerEmail && !isValidEmail(managerEmail)) {
      return res.status(400).json({
        success: false,
        message: "Invalid manager email format",
      });
    }

    // Check if team name already exists
    const existingTeam = await prisma.team.findUnique({
      where: { name: name.trim() },
    });

    if (existingTeam) {
      return res.status(409).json({
        success: false,
        message: "Team name already exists",
      });
    }

    // Verify client exists if provided
    if (clientId) {
      const clientExists = await prisma.client.findUnique({
        where: { id: Number(clientId) },
      });
      if (!clientExists) {
        return res.status(404).json({
          success: false,
          message: "Client not found",
        });
      }
    }

    // Create team
    const team = await prisma.team.create({
      data: {
        name: name.trim(),
        // title: title?.trim() || null,
        managerName: managerName?.trim() || null,
        managerEmail: managerEmail?.trim() || null,
        clientId: clientId ? Number(clientId) : null,
      },
      include: {
        client: true,
        _count: {
          select: { employees: true },
        },
      },
    });

    // Associate employees if provided
    if (employeeIds && Array.isArray(employeeIds) && employeeIds.length > 0) {
      await prisma.employee.updateMany({
        where: {
          id: { in: employeeIds.map(Number) },
        },
        data: {
          teamId: team.id,
        },
      });
    }

    // Fetch the created team with employees
    const teamWithEmployees = await prisma.team.findUnique({
      where: { id: team.id },
      include: {
        client: true,
        employees: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        _count: {
          select: { employees: true },
        },
      },
    });

    res.status(201).json({
      success: true,
      message: "Team created successfully",
      data: teamWithEmployees,
    });
  } catch (err) {
    console.error("createTeam error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to create team",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
}

/**
 * PUT /api/teams/:id
 * Update a team
 */
async function updateTeam(req, res) {
  const prisma = req.prisma;
  const id = Number(req.params.id);

  if (isNaN(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid team ID",
    });
  }

  try {
    const {
      name,
      title,
      managerName,
      managerEmail,
      clientId,
      employeeIds, // Array of employee IDs to associate
    } = req.body;

    // Check if team exists
    const existingTeam = await prisma.team.findUnique({
      where: { id },
    });

    if (!existingTeam) {
      return res.status(404).json({
        success: false,
        message: "Team not found",
      });
    }

    // Validate manager email if provided
    if (managerEmail && !isValidEmail(managerEmail)) {
      return res.status(400).json({
        success: false,
        message: "Invalid manager email format",
      });
    }

    // Check for duplicate name if name is being changed
    if (name && name.trim() !== existingTeam.name) {
      const duplicate = await prisma.team.findUnique({
        where: { name: name.trim() },
      });
      if (duplicate) {
        return res.status(409).json({
          success: false,
          message: "Team name already exists",
        });
      }
    }

    // Verify client exists if provided
    if (clientId !== undefined && clientId !== null) {
      const clientExists = await prisma.client.findUnique({
        where: { id: Number(clientId) },
      });
      if (!clientExists) {
        return res.status(404).json({
          success: false,
          message: "Client not found",
        });
      }
    }

    // Build update data
    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    // if (title !== undefined) updateData.title = title?.trim() || null;
    if (managerName !== undefined)
      updateData.managerName = managerName?.trim() || null;
    if (managerEmail !== undefined)
      updateData.managerEmail = managerEmail?.trim() || null;
    if (clientId !== undefined) {
      updateData.clientId = clientId ? Number(clientId) : null;
    }

    // Update team
    const team = await prisma.team.update({
      where: { id },
      data: updateData,
      include: {
        client: true,
        _count: {
          select: { employees: true },
        },
      },
    });

    // Update employee associations if provided
    if (employeeIds !== undefined && Array.isArray(employeeIds)) {
      // Remove team from all current employees
      await prisma.employee.updateMany({
        where: { teamId: id },
        data: { teamId: null },
      });

      // Add team to selected employees
      if (employeeIds.length > 0) {
        await prisma.employee.updateMany({
          where: {
            id: { in: employeeIds.map(Number) },
          },
          data: {
            teamId: id,
          },
        });
      }
    }

    // Fetch updated team with employees
    const teamWithEmployees = await prisma.team.findUnique({
      where: { id },
      include: {
        client: true,
        employees: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        _count: {
          select: { employees: true },
        },
      },
    });

    res.json({
      success: true,
      message: "Team updated successfully",
      data: teamWithEmployees,
    });
  } catch (err) {
    console.error("updateTeam error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to update team",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
}

/**
 * DELETE /api/teams/:id
 * Delete a team
 */
async function deleteTeam(req, res) {
  const prisma = req.prisma;
  const id = Number(req.params.id);

  if (isNaN(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid team ID",
    });
  }

  try {
    // Check if team exists
    const team = await prisma.team.findUnique({
      where: { id },
      include: {
        _count: {
          select: { employees: true },
        },
      },
    });

    if (!team) {
      return res.status(404).json({
        success: false,
        message: "Team not found",
      });
    }

    // Remove team association from employees
    await prisma.employee.updateMany({
      where: { teamId: id },
      data: { teamId: null },
    });

    // Delete team
    await prisma.team.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: "Team deleted successfully",
    });
  } catch (err) {
    console.error("deleteTeam error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to delete team",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
}

/**
 * GET /api/teams/:id/employees
 * Get all employees in a team
 */
async function getTeamEmployees(req, res) {
  const prisma = req.prisma;
  const id = Number(req.params.id);

  if (isNaN(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid team ID",
    });
  }

  try {
    const team = await prisma.team.findUnique({
      where: { id },
      select: { id: true, name: true },
    });

    if (!team) {
      return res.status(404).json({
        success: false,
        message: "Team not found",
      });
    }

    const employees = await prisma.employee.findMany({
      where: { teamId: id },
      select: {
        id: true,
        employeeCode: true,
        firstName: true,
        lastName: true,
        email: true,
        title: true,
        active: true,
        dateOfJoining: true,
      },
      orderBy: { firstName: "asc" },
    });

    res.json({
      success: true,
      data: employees,
      team: team,
    });
  } catch (err) {
    console.error("getTeamEmployees error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch team employees",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
}

// Helper function to validate email
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

module.exports = {
  getTeams,
  getTeamById,
  createTeam,
  updateTeam,
  deleteTeam,
  getTeamEmployees,
};
