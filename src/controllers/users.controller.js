// controllers/users.controller.js

/**
 * GET /api/users
 * Get all users (admin only)
 */
async function getUsers(req, res) {
  const prisma = req.prisma;

  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({
      success: true,
      data: users,
    });
  } catch (err) {
    console.error("getUsers error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch users",
    });
  }
}

/**
 * GET /api/users/:id
 * Get a single user by ID
 */
async function getUserById(req, res) {
  const prisma = req.prisma;
  const id = Number(req.params.id);

  if (isNaN(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid user ID",
    });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (err) {
    console.error("getUserById error:", err);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

/**
 * PATCH /api/users/:id/status
 * Update user active status
 */
async function updateUserStatus(req, res) {
  const prisma = req.prisma;
  const id = Number(req.params.id);
  const { active } = req.body;

  if (isNaN(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid user ID",
    });
  }

  if (typeof active !== "boolean") {
    return res.status(400).json({
      success: false,
      message: "Active status must be a boolean",
    });
  }

  try {
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Prevent deactivating admin@arithaconsulting.com
    if (
      existingUser.email === "admin@arithaconsulting.com" &&
      active === false
    ) {
      return res.status(403).json({
        success: false,
        message: "Cannot deactivate the main admin account",
      });
    }

    // Update user status
    const user = await prisma.user.update({
      where: { id },
      data: { active },
      select: {
        id: true,
        email: true,
        role: true,
        active: true,
        updatedAt: true,
      },
    });

    res.json({
      success: true,
      message: `User ${active ? "activated" : "deactivated"} successfully`,
      data: user,
    });
  } catch (err) {
    console.error("updateUserStatus error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to update user status",
    });
  }
}
async function updateUserRole(req, res) {
  const prisma = req.prisma;
  const id = Number(req.params.id);
  const { role } = req.body;

  if (isNaN(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid user ID",
    });
  }

  // Validate role
  if (!role || !["hr", "admin"].includes(role)) {
    return res.status(400).json({
      success: false,
      message: "Invalid role. Must be 'hr' or 'admin'",
    });
  }

  try {
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Prevent changing admin@arithaconsulting.com role
    if (existingUser.email === "admin@arithaconsulting.com") {
      return res.status(403).json({
        success: false,
        message: "Cannot change role of primary admin account",
      });
    }

    // Update user role
    const user = await prisma.user.update({
      where: { id },
      data: { role },
      select: {
        id: true,
        email: true,
        role: true,
        active: true,
        updatedAt: true,
      },
    });

    res.json({
      success: true,
      message: "User role updated successfully",
      data: user,
    });
  } catch (err) {
    console.error("updateUserRole error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to update user role",
    });
  }
}

/**
 * DELETE /api/users/:id
 * Delete a user (admin only)
 */
async function deleteUser(req, res) {
  const prisma = req.prisma;
  const id = Number(req.params.id);

  if (isNaN(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid user ID",
    });
  }

  try {
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
      include: {
        _count: {
          select: { notes: true },
        },
      },
    });

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Prevent deleting admin@arithaconsulting.com
    if (existingUser.email === "admin@arithaconsulting.com") {
      return res.status(403).json({
        success: false,
        message: "Cannot delete the main admin account",
      });
    }

    // Check if user has notes
    if (existingUser._count.notes > 0) {
      return res.status(409).json({
        success: false,
        message: `Cannot delete user with ${existingUser._count.notes} note(s). Please reassign or delete notes first.`,
      });
    }

    // Delete user
    await prisma.user.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (err) {
    console.error("deleteUser error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to delete user",
    });
  }
}

module.exports = {
  getUsers,
  getUserById,
  updateUserStatus,
  updateUserRole,
  deleteUser,
};
