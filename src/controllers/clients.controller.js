// controllers/clients.controller.js

/**
 * GET /api/clients
 * Get all clients with optional filters
 */
async function getClients(req, res) {
  const prisma = req.prisma;

  try {
    const { search, includeTeams, includeEmployees } = req.query;

    const where = {};

    // Search by client name, POC names, or address
    if (search && search.trim()) {
      where.OR = [
        { name: { contains: search.trim(), mode: "insensitive" } },
        { pocInternalName: { contains: search.trim(), mode: "insensitive" } },
        { pocExternalName: { contains: search.trim(), mode: "insensitive" } },
        { address: { contains: search.trim(), mode: "insensitive" } },
      ];
    }

    const clients = await prisma.client.findMany({
      where,
      include: {
        teams:
          includeTeams === "true"
            ? {
                select: {
                  id: true,
                  name: true,
                  title: true,
                  managerName: true,
                  _count: {
                    select: { employees: true },
                  },
                },
              }
            : false,
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
          select: {
            teams: true,
            employees: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    res.json({
      success: true,
      data: clients,
    });
  } catch (err) {
    console.error("getClients error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch clients",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
}

/**
 * GET /api/clients/:id
 * Get a single client by ID with full details
 */
async function getClientById(req, res) {
  const prisma = req.prisma;
  const id = Number(req.params.id);

  if (isNaN(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid client ID",
    });
  }

  try {
    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        teams: {
          select: {
            id: true,
            name: true,
            // title: true,
            managerName: true,
            managerEmail: true,
            _count: {
              select: { employees: true },
            },
          },
          orderBy: { name: "asc" },
        },
        employees: {
          where: { active: true },
          select: {
            id: true,
            employeeCode: true,
            firstName: true,
            lastName: true,
            email: true,
            title: true,
            team: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: { firstName: "asc" },
        },
        _count: {
          select: {
            teams: true,
            employees: true,
          },
        },
      },
    });

    if (!client) {
      return res.status(404).json({
        success: false,
        message: "Client not found",
      });
    }

    res.json({
      success: true,
      data: client,
    });
  } catch (err) {
    console.error("getClientById error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch client",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
}

/**
 * POST /api/clients
 * Create a new client
 */
async function createClient(req, res) {
  const prisma = req.prisma;

  try {
    const {
      name,
      pocInternalName,
      pocInternalEmail,
      pocExternalName,
      pocExternalEmail,
      address,
    } = req.body;

    // Validation
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Client name is required",
      });
    }

    // Validate emails if provided
    if (pocInternalEmail && !isValidEmail(pocInternalEmail)) {
      return res.status(400).json({
        success: false,
        message: "Invalid internal POC email format",
      });
    }

    if (pocExternalEmail && !isValidEmail(pocExternalEmail)) {
      return res.status(400).json({
        success: false,
        message: "Invalid external POC email format",
      });
    }

    // Check if client name already exists
    const existingClient = await prisma.client.findUnique({
      where: { name: name.trim() },
    });

    if (existingClient) {
      return res.status(409).json({
        success: false,
        message: "Client name already exists",
      });
    }

    // Create client
    const client = await prisma.client.create({
      data: {
        name: name.trim(),
        pocInternalName: pocInternalName?.trim() || null,
        pocInternalEmail: pocInternalEmail?.trim() || null,
        pocExternalName: pocExternalName?.trim() || null,
        pocExternalEmail: pocExternalEmail?.trim() || null,
        address: address?.trim() || null,
      },
      include: {
        _count: {
          select: {
            teams: true,
            employees: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      message: "Client created successfully",
      data: client,
    });
  } catch (err) {
    console.error("createClient error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to create client",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
}

/**
 * PUT /api/clients/:id
 * Update a client
 */
async function updateClient(req, res) {
  const prisma = req.prisma;
  const id = Number(req.params.id);

  if (isNaN(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid client ID",
    });
  }

  try {
    const {
      name,
      pocInternalName,
      pocInternalEmail,
      pocExternalName,
      pocExternalEmail,
      address,
    } = req.body;

    // Check if client exists
    const existingClient = await prisma.client.findUnique({
      where: { id },
    });

    if (!existingClient) {
      return res.status(404).json({
        success: false,
        message: "Client not found",
      });
    }

    // Validate emails if provided
    if (pocInternalEmail && !isValidEmail(pocInternalEmail)) {
      return res.status(400).json({
        success: false,
        message: "Invalid internal POC email format",
      });
    }

    if (pocExternalEmail && !isValidEmail(pocExternalEmail)) {
      return res.status(400).json({
        success: false,
        message: "Invalid external POC email format",
      });
    }

    // Check for duplicate name if name is being changed
    if (name && name.trim() !== existingClient.name) {
      const duplicate = await prisma.client.findUnique({
        where: { name: name.trim() },
      });
      if (duplicate) {
        return res.status(409).json({
          success: false,
          message: "Client name already exists",
        });
      }
    }

    // Build update data
    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (pocInternalName !== undefined)
      updateData.pocInternalName = pocInternalName?.trim() || null;
    if (pocInternalEmail !== undefined)
      updateData.pocInternalEmail = pocInternalEmail?.trim() || null;
    if (pocExternalName !== undefined)
      updateData.pocExternalName = pocExternalName?.trim() || null;
    if (pocExternalEmail !== undefined)
      updateData.pocExternalEmail = pocExternalEmail?.trim() || null;
    if (address !== undefined) updateData.address = address?.trim() || null;

    // Update client
    const client = await prisma.client.update({
      where: { id },
      data: updateData,
      include: {
        teams: {
          select: {
            id: true,
            name: true,
            _count: {
              select: { employees: true },
            },
          },
        },
        _count: {
          select: {
            teams: true,
            employees: true,
          },
        },
      },
    });

    res.json({
      success: true,
      message: "Client updated successfully",
      data: client,
    });
  } catch (err) {
    console.error("updateClient error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to update client",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
}

/**
 * DELETE /api/clients/:id
 * Delete a client
 */
async function deleteClient(req, res) {
  const prisma = req.prisma;
  const id = Number(req.params.id);

  if (isNaN(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid client ID",
    });
  }

  try {
    // Check if client exists
    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            teams: true,
            employees: true,
          },
        },
      },
    });

    if (!client) {
      return res.status(404).json({
        success: false,
        message: "Client not found",
      });
    }

    // Check if client has associated teams or employees
    if (client._count.teams > 0 || client._count.employees > 0) {
      return res.status(409).json({
        success: false,
        message: `Cannot delete client. It has ${client._count.teams} team(s) and ${client._count.employees} employee(s) associated.`,
      });
    }

    // Delete client
    await prisma.client.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: "Client deleted successfully",
    });
  } catch (err) {
    console.error("deleteClient error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to delete client",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
}

/**
 * GET /api/clients/:id/teams
 * Get all teams for a client
 */
async function getClientTeams(req, res) {
  const prisma = req.prisma;
  const id = Number(req.params.id);

  if (isNaN(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid client ID",
    });
  }

  try {
    const client = await prisma.client.findUnique({
      where: { id },
      select: { id: true, name: true },
    });

    if (!client) {
      return res.status(404).json({
        success: false,
        message: "Client not found",
      });
    }

    const teams = await prisma.team.findMany({
      where: { clientId: id },
      include: {
        _count: {
          select: { employees: true },
        },
      },
      orderBy: { name: "asc" },
    });

    res.json({
      success: true,
      data: teams,
      client: client,
    });
  } catch (err) {
    console.error("getClientTeams error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch client teams",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
}

/**
 * GET /api/clients/:id/employees
 * Get all employees for a client
 */
async function getClientEmployees(req, res) {
  const prisma = req.prisma;
  const id = Number(req.params.id);

  if (isNaN(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid client ID",
    });
  }

  try {
    const client = await prisma.client.findUnique({
      where: { id },
      select: { id: true, name: true },
    });

    if (!client) {
      return res.status(404).json({
        success: false,
        message: "Client not found",
      });
    }

    const employees = await prisma.employee.findMany({
      where: { clientId: id },
      select: {
        id: true,
        employeeCode: true,
        firstName: true,
        lastName: true,
        email: true,
        title: true,
        active: true,
        team: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { firstName: "asc" },
    });

    res.json({
      success: true,
      data: employees,
      client: client,
    });
  } catch (err) {
    console.error("getClientEmployees error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch client employees",
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
  getClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient,
  getClientTeams,
  getClientEmployees,
};
