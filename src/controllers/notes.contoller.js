async function getEmployeeNotes(req, res) {
  const prisma = req.prisma;
  const employeeId = Number(req.params.id);

  try {
    const notes = await prisma.note.findMany({
      where: { employeeId },
      orderBy: { noteDate: "desc" },
      include: {
        author: {
          select: { id: true, email: true },
        },
      },
    });

    res.json(notes);
  } catch (err) {
    console.error("getEmployeeNotes error:", err);
    res.status(500).json({ message: "Failed to fetch notes" });
  }
}

async function addEmployeeNote(req, res) {
  const prisma = req.prisma;
  const employeeId = Number(req.params.id);
  const userId = req.user?.userId; // from auth middleware

  const { content, noteDate } = req.body;

  if (!content || !content.trim()) {
    return res.status(400).json({ message: "Note content is required" });
  }

  try {
    // optional: ensure employee exists
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { id: true },
    });

    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    const note = await prisma.note.create({
      data: {
        content: content.trim(),
        noteDate: noteDate ? new Date(noteDate) : null,
        employeeId,
        authorId: userId,
      },
      include: {
        author: {
          select: { id: true, email: true },
        },
      },
    });

    res.status(201).json(note);
  } catch (err) {
    console.error("addEmployeeNote error:", err);
    res.status(500).json({ message: "Failed to add note" });
  }
}

module.exports = {
  getEmployeeNotes,
  addEmployeeNote,
};
