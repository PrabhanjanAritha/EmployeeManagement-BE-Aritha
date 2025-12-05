// ============================================
// VALIDATION HELPERS
// ============================================
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePhone = (phone) => {
  // Basic phone validation - adjust regex based on your requirements
  const phoneRegex = /^[\d\s\-\+\(\)]+$/;
  return phone.length >= 10 && phoneRegex.test(phone);
};

const validateEmployeeData = (data, isUpdate = false) => {
  const errors = [];

  // Required fields for creation
  if (!isUpdate) {
    if (!data.firstName?.trim()) errors.push("First name is required");
    if (!data.lastName?.trim()) errors.push("Last name is required");

    if (!data.personalEmail && !data.companyEmail) {
      errors.push("At least one email (personal or company) is required");
    }
  }

  // Email validation
  if (data.personalEmail && !validateEmail(data.personalEmail)) {
    errors.push("Invalid personal email format");
  }
  if (data.companyEmail && !validateEmail(data.companyEmail)) {
    errors.push("Invalid company email format");
  }

  // Phone validation
  if (data.phone && !validatePhone(data.phone)) {
    errors.push("Invalid phone number format");
  }

  // Date validation
  if (data.dob && isNaN(Date.parse(data.dob))) {
    errors.push("Invalid date of birth");
  }
  if (data.doj && isNaN(Date.parse(data.doj))) {
    errors.push("Invalid date of joining");
  }

  // Experience validation
  if (data.experienceYears !== undefined && data.experienceYears !== null) {
    const exp = Number(data.experienceYears);
    if (isNaN(exp) || exp < 0 || exp > 70) {
      errors.push("Experience years must be between 0 and 70");
    }
  }

  if (data.experienceMonths !== undefined && data.experienceMonths !== null) {
    const exp = Number(data.experienceMonths);
    if (isNaN(exp) || exp < 0 || exp > 11) {
      errors.push("Experience months must be between 0 and 11");
    }
  }

  // Gender validation
  if (
    data.gender &&
    !["Male", "Female", "Other", "Prefer not to say"].includes(data.gender)
  ) {
    errors.push("Invalid gender value");
  }

  // Status/Active validation
  if (data.active !== undefined && typeof data.active !== "boolean") {
    errors.push("Active status must be a boolean");
  }

  return errors;
};

// ============================================
// CONTROLLER FUNCTIONS
// ============================================

/**
 * GET /api/employees
 * Fetch employees with advanced filtering, search, and pagination
 */
async function getEmployees(req, res) {
  const prisma = req.prisma;

  try {
    const {
      search,
      teamId,
      clientId,
      title,
      gender,
      minExp,
      maxExp,
      status, // "active" | "inactive" | undefined
      sortBy = "createdAt", // field to sort by
      sortOrder = "desc", // "asc" | "desc"
      page = "1",
      pageSize = "10",
    } = req.query;

    // Pagination
    const pageNum = Math.max(1, Number(page) || 1);
    const sizeNum = Math.min(100, Math.max(1, Number(pageSize) || 10)); // Max 100 per page
    const skip = (pageNum - 1) * sizeNum;

    const where = {};

    // Search across multiple fields
    if (search && search.trim()) {
      const searchTerm = search.trim();
      where.OR = [
        { employeeCode: { contains: searchTerm, mode: "insensitive" } },
        { firstName: { contains: searchTerm, mode: "insensitive" } },
        { lastName: { contains: searchTerm, mode: "insensitive" } },
        { email: { contains: searchTerm, mode: "insensitive" } },
        { personalEmail: { contains: searchTerm, mode: "insensitive" } },
        { companyEmail: { contains: searchTerm, mode: "insensitive" } },
        { title: { contains: searchTerm, mode: "insensitive" } },
      ];
    }

    // Team filter
    if (teamId) {
      const teamIdNum = Number(teamId);
      if (!isNaN(teamIdNum)) {
        where.teamId = teamIdNum;
      }
    }

    // Client filter
    if (clientId) {
      const clientIdNum = Number(clientId);
      if (!isNaN(clientIdNum)) {
        where.clientId = clientIdNum;
      }
    }

    // Title filter
    if (title && title.trim()) {
      where.title = { contains: title.trim(), mode: "insensitive" };
    }

    // Gender filter
    if (gender && gender.trim()) {
      where.gender = gender.trim();
    }

    // Experience range filter
    const expFilter = {};
    if (minExp !== undefined && minExp !== "") {
      const minExpNum = Number(minExp);
      if (!isNaN(minExpNum)) expFilter.gte = minExpNum;
    }
    if (maxExp !== undefined && maxExp !== "") {
      const maxExpNum = Number(maxExp);
      if (!isNaN(maxExpNum)) expFilter.lte = maxExpNum;
    }
    if (Object.keys(expFilter).length > 0) {
      where.experienceYearsAtJoining = expFilter;
    }

    // Active/Inactive status filter
    if (status === "active") {
      where.active = true;
    } else if (status === "inactive") {
      where.active = false;
    }
    // If status is undefined/null: return all employees

    // Dynamic sorting
    const validSortFields = [
      "createdAt",
      "firstName",
      "lastName",
      "dateOfJoining",
      "employeeCode",
    ];
    const orderByField = validSortFields.includes(sortBy)
      ? sortBy
      : "createdAt";
    const orderByDirection = sortOrder === "asc" ? "asc" : "desc";

    // Parallel queries for better performance
    const [employees, total] = await Promise.all([
      prisma.employee.findMany({
        where,
        include: {
          team: { select: { id: true, name: true } },
          client: { select: { id: true, name: true, industry: true } },
          _count: { select: { notes: true } }, // Count of notes for each employee
        },
        orderBy: { [orderByField]: orderByDirection },
        skip,
        take: sizeNum,
      }),
      prisma.employee.count({ where }),
    ]);

    const totalPages = Math.ceil(total / sizeNum);

    res.json({
      success: true,
      data: employees,
      pagination: {
        total,
        page: pageNum,
        pageSize: sizeNum,
        totalPages,
        hasMore: pageNum < totalPages,
      },
    });
  } catch (err) {
    console.error("getEmployees error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch employees",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
}

/**
 * GET /api/employees/:id
 * Fetch a single employee by ID with full details
 */
async function getEmployeeById(req, res) {
  const prisma = req.prisma;
  const id = Number(req.params.id);

  if (isNaN(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid employee ID",
    });
  }

  try {
    const employee = await prisma.employee.findUnique({
      where: { id },
      include: {
        team: true,
        client: true,
        notes: {
          include: {
            author: {
              select: { id: true, email: true, role: true },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    res.json({
      success: true,
      data: employee,
    });
  } catch (err) {
    console.error("getEmployeeById error:", err);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
}

/**
 * POST /api/employees
 * Create a new employee with validation
 */
async function createEmployee(req, res) {
  const prisma = req.prisma;

  try {
    const {
      employeeCode,
      team,
      teamId,
      clientId,
      firstName,
      lastName,
      dob,
      doj,
      personalEmail,
      companyEmail,
      phone,
      experienceYears,
      experienceMonths,
      title,
      gender,
      active = true, // ✅ NEW: Default to active
    } = req.body;

    // Validate input
    const validationErrors = validateEmployeeData(req.body);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validationErrors,
      });
    }

    // Check for duplicate employee code
    if (employeeCode) {
      const existing = await prisma.employee.findUnique({
        where: { employeeCode },
      });
      if (existing) {
        return res.status(409).json({
          success: false,
          message: "Employee code already exists",
        });
      }
    }

    // Check for duplicate email
    const mainEmail = companyEmail || personalEmail;
    const existingEmail = await prisma.employee.findUnique({
      where: { email: mainEmail },
    });
    if (existingEmail) {
      return res.status(409).json({
        success: false,
        message: "Email already exists",
      });
    }

    // Verify team exists if teamId provided
    if (teamId) {
      const teamExists = await prisma.team.findUnique({
        where: { id: Number(teamId) },
      });
      if (!teamExists) {
        return res.status(404).json({
          success: false,
          message: "Team not found",
        });
      }
    }

    // Verify client exists if clientId provided
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

    // Create employee
    const employee = await prisma.employee.create({
      data: {
        employeeCode: employeeCode?.trim() || null,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: mainEmail,
        personalEmail: personalEmail?.trim() || null,
        companyEmail: companyEmail?.trim() || null,
        phone: phone?.trim() || null,
        dateOfBirth: dob ? new Date(dob) : null,
        dateOfJoining: doj ? new Date(doj) : null,
        experienceYearsAtJoining:
          experienceYears !== undefined && experienceYears !== null
            ? Number(experienceYears)
            : null,
        experienceMonthsAtJoining:
          experienceMonths !== undefined && experienceMonths !== null
            ? Number(experienceMonths)
            : null,
        teamName: team?.trim() || null,
        title: title?.trim() || team?.trim() || null,
        gender: gender?.trim() || null,
        active: Boolean(active), // ✅ Set active status
        teamId: teamId ? Number(teamId) : null,
        clientId: clientId ? Number(clientId) : null,
      },
      include: {
        team: true,
        client: true,
      },
    });

    res.status(201).json({
      success: true,
      message: "Employee created successfully",
      data: employee,
    });
  } catch (err) {
    console.error("createEmployee error:", err);

    // Handle Prisma unique constraint errors
    if (err.code === "P2002") {
      return res.status(409).json({
        success: false,
        message: "Duplicate entry: Email or employee code already exists",
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to create employee",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
}

/**
 * PUT /api/employees/:id
 * Update an existing employee
 */
async function updateEmployee(req, res) {
  const prisma = req.prisma;
  const id = Number(req.params.id);

  if (isNaN(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid employee ID",
    });
  }

  try {
    const {
      employeeCode,
      team,
      teamId,
      clientId,
      firstName,
      lastName,
      dob,
      doj,
      personalEmail,
      companyEmail,
      phone,
      experienceYears,
      experienceMonths,
      title,
      gender,
      active, // ✅ Can now update active status
    } = req.body;

    // Validate input
    const validationErrors = validateEmployeeData(req.body, true);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validationErrors,
      });
    }

    // Check if employee exists
    const existingEmployee = await prisma.employee.findUnique({
      where: { id },
    });
    if (!existingEmployee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    // Check for duplicate employee code (excluding current employee)
    if (employeeCode && employeeCode !== existingEmployee.employeeCode) {
      const duplicate = await prisma.employee.findUnique({
        where: { employeeCode },
      });
      if (duplicate) {
        return res.status(409).json({
          success: false,
          message: "Employee code already exists",
        });
      }
    }

    // Build update data
    const updateData = {};

    if (employeeCode !== undefined)
      updateData.employeeCode = employeeCode?.trim() || null;
    if (firstName !== undefined) updateData.firstName = firstName.trim();
    if (lastName !== undefined) updateData.lastName = lastName.trim();
    if (phone !== undefined) updateData.phone = phone?.trim() || null;
    if (dob !== undefined) updateData.dateOfBirth = dob ? new Date(dob) : null;
    if (doj !== undefined)
      updateData.dateOfJoining = doj ? new Date(doj) : null;
    if (title !== undefined) updateData.title = title?.trim() || null;
    if (gender !== undefined) updateData.gender = gender?.trim() || null;
    if (team !== undefined) updateData.teamName = team?.trim() || null;
    if (active !== undefined) updateData.active = Boolean(active); // ✅ Update active status

    // Handle emails
    if (personalEmail !== undefined)
      updateData.personalEmail = personalEmail?.trim() || null;
    if (companyEmail !== undefined)
      updateData.companyEmail = companyEmail?.trim() || null;

    // Update main email if either email changed
    if (companyEmail !== undefined || personalEmail !== undefined) {
      const newMainEmail =
        (companyEmail !== undefined
          ? companyEmail
          : existingEmployee.companyEmail) ||
        (personalEmail !== undefined
          ? personalEmail
          : existingEmployee.personalEmail);

      if (newMainEmail && newMainEmail !== existingEmployee.email) {
        // Check if new email is already taken
        const emailTaken = await prisma.employee.findFirst({
          where: {
            email: newMainEmail,
            id: { not: id },
          },
        });
        if (emailTaken) {
          return res.status(409).json({
            success: false,
            message: "Email already exists",
          });
        }
        updateData.email = newMainEmail;
      }
    }

    // Handle experience
    if (experienceYears !== undefined && experienceYears !== null) {
      updateData.experienceYearsAtJoining = Number(experienceYears);
    }
    if (experienceMonths !== undefined && experienceMonths !== null) {
      updateData.experienceMonthsAtJoining = Number(experienceMonths);
    }

    // Handle team and client relationships
    if (teamId !== undefined) {
      if (teamId === null) {
        updateData.teamId = null;
      } else {
        const teamExists = await prisma.team.findUnique({
          where: { id: Number(teamId) },
        });
        if (!teamExists) {
          return res.status(404).json({
            success: false,
            message: "Team not found",
          });
        }
        updateData.teamId = Number(teamId);
      }
    }

    if (clientId !== undefined) {
      if (clientId === null) {
        updateData.clientId = null;
      } else {
        const clientExists = await prisma.client.findUnique({
          where: { id: Number(clientId) },
        });
        if (!clientExists) {
          return res.status(404).json({
            success: false,
            message: "Client not found",
          });
        }
        updateData.clientId = Number(clientId);
      }
    }

    // Update employee
    const employee = await prisma.employee.update({
      where: { id },
      data: updateData,
      include: {
        team: true,
        client: true,
      },
    });

    res.json({
      success: true,
      message: "Employee updated successfully",
      data: employee,
    });
  } catch (err) {
    console.error("updateEmployee error:", err);

    if (err.code === "P2002") {
      return res.status(409).json({
        success: false,
        message: "Duplicate entry: Email or employee code already exists",
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to update employee",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
}

/**
 * DELETE /api/employees/:id
 * Soft delete (deactivate) or hard delete an employee
 */
async function deleteEmployee(req, res) {
  const prisma = req.prisma;
  const id = Number(req.params.id);
  const { hard = "false" } = req.query; // ?hard=true for permanent deletion

  if (isNaN(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid employee ID",
    });
  }

  try {
    // Check if employee exists
    const employee = await prisma.employee.findUnique({
      where: { id },
      include: {
        _count: {
          select: { notes: true },
        },
      },
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    if (hard === "true") {
      // Hard delete - permanently remove from database
      // Note: This will fail if there are related notes due to foreign key constraints
      // You might want to delete notes first or use CASCADE in Prisma schema
      try {
        await prisma.employee.delete({ where: { id } });
        return res.json({
          success: true,
          message: "Employee permanently deleted",
        });
      } catch (deleteErr) {
        if (deleteErr.code === "P2003") {
          return res.status(409).json({
            success: false,
            message:
              "Cannot delete employee with existing notes. Please delete notes first or use soft delete.",
          });
        }
        throw deleteErr;
      }
    } else {
      // Soft delete - mark as inactive
      const updated = await prisma.employee.update({
        where: { id },
        data: { active: false },
      });

      res.json({
        success: true,
        message: "Employee deactivated successfully",
        data: updated,
      });
    }
  } catch (err) {
    console.error("deleteEmployee error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to delete employee",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
}

/**
 * PATCH /api/employees/:id/toggle-status
 * Toggle employee active status (quick activate/deactivate)
 */
async function toggleEmployeeStatus(req, res) {
  const prisma = req.prisma;
  const id = Number(req.params.id);

  if (isNaN(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid employee ID",
    });
  }

  try {
    const employee = await prisma.employee.findUnique({
      where: { id },
      select: { id: true, active: true },
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    const updated = await prisma.employee.update({
      where: { id },
      data: { active: !employee.active },
      select: { id: true, active: true, firstName: true, lastName: true },
    });

    res.json({
      success: true,
      message: `Employee ${
        updated.active ? "activated" : "deactivated"
      } successfully`,
      data: updated,
    });
  } catch (err) {
    console.error("toggleEmployeeStatus error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to toggle employee status",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
}

/**
 * GET /api/employees/stats
 * Get employee statistics
 */
async function getEmployeeStats(req, res) {
  const prisma = req.prisma;

  try {
    const [
      totalEmployees,
      activeEmployees,
      inactiveEmployees,
      employeesByTeam,
      employeesByClient,
    ] = await Promise.all([
      prisma.employee.count(),
      prisma.employee.count({ where: { active: true } }),
      prisma.employee.count({ where: { active: false } }),
      prisma.employee.groupBy({
        by: ["teamId"],
        _count: true,
        where: { teamId: { not: null } },
      }),
      prisma.employee.groupBy({
        by: ["clientId"],
        _count: true,
        where: { clientId: { not: null } },
      }),
    ]);

    res.json({
      success: true,
      data: {
        total: totalEmployees,
        active: activeEmployees,
        inactive: inactiveEmployees,
        byTeam: employeesByTeam,
        byClient: employeesByClient,
      },
    });
  } catch (err) {
    console.error("getEmployeeStats error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch employee statistics",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
}

module.exports = {
  getEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  toggleEmployeeStatus,
  getEmployeeStats,
};
