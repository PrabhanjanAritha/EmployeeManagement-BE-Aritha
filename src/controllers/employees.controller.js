async function getEmployees(req, res) {
  const prisma = req.prisma;
  try {
    const employees = await prisma.employee.findMany({
      include: { team: true, client: true },
    });
    res.json(employees);
  } catch (err) {
    console.error("getEmployees error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
}

async function getEmployeeById(req, res) {
  const prisma = req.prisma;
  const id = Number(req.params.id);

  try {
    const employee = await prisma.employee.findUnique({
      where: { id },
      include: { team: true, client: true },
    });

    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    res.json(employee);
  } catch (err) {
    console.error("getEmployeeById error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
}

async function createEmployee(req, res) {
  const prisma = req.prisma;

  try {
    const {
      employeeId,
      team, // string like "Engineering"
      firstName,
      lastName,
      dob,
      doj,
      personalEmail,
      companyEmail,
      phone,
      experienceYears,
      experienceMonths,
    } = req.body;

    const mainEmail = companyEmail || personalEmail;
    if (!mainEmail) {
      return res.status(400).json({
        message: "At least one email (personal or company) is required",
      });
    }

    const employee = await prisma.employee.create({
      data: {
        employeeCode: employeeId || null,
        firstName,
        lastName,
        email: mainEmail,
        personalEmail: personalEmail || null,
        companyEmail: companyEmail || null,
        phone: phone || null,
        dateOfBirth: dob ? new Date(dob) : null,
        dateOfJoining: doj ? new Date(doj) : null,
        experienceYearsAtJoining:
          typeof experienceYears === "number" ? experienceYears : null,
        experienceMonthsAtJoining:
          typeof experienceMonths === "number" ? experienceMonths : null,
        teamName: team || null,
        title: team || null, // optional: reuse team as title for now

        // teamId, clientId can be wired later when you pick from real teams/clients
        // teamId: null,
        // clientId: null,
      },
    });

    res.status(201).json(employee);
  } catch (err) {
    console.error("createEmployee error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
}

async function updateEmployee(req, res) {
  const prisma = req.prisma;
  const id = Number(req.params.id);

  try {
    const {
      employeeId,
      team,
      firstName,
      lastName,
      dob,
      doj,
      personalEmail,
      companyEmail,
      phone,
      experienceYears,
      experienceMonths,
    } = req.body;

    const mainEmail = companyEmail || personalEmail;

    const employee = await prisma.employee.update({
      where: { id },
      data: {
        employeeCode: employeeId ?? undefined,
        firstName: firstName ?? undefined,
        lastName: lastName ?? undefined,
        email: mainEmail ?? undefined,
        personalEmail: personalEmail ?? undefined,
        companyEmail: companyEmail ?? undefined,
        phone: phone ?? undefined,
        dateOfBirth: dob ? new Date(dob) : undefined,
        dateOfJoining: doj ? new Date(doj) : undefined,
        experienceYearsAtJoining:
          typeof experienceYears === "number" ? experienceYears : undefined,
        experienceMonthsAtJoining:
          typeof experienceMonths === "number" ? experienceMonths : undefined,
        teamName: team ?? undefined,
        title: team ?? undefined,
      },
    });

    res.json(employee);
  } catch (err) {
    console.error("updateEmployee error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
}

async function deleteEmployee(req, res) {
  const prisma = req.prisma;
  const id = Number(req.params.id);

  try {
    await prisma.employee.delete({ where: { id } });
    res.status(204).send();
  } catch (err) {
    console.error("deleteEmployee error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
}

module.exports = {
  getEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
};
