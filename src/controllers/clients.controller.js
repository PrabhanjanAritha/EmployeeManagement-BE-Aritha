async function getClients(req, res) {
  const prisma = req.prisma;
  try {
    const clients = await prisma.client.findMany({
      include: { employees: true },
    });
    res.json(clients);
  } catch (err) {
    console.error("getClients error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
}

async function getClientById(req, res) {
  const prisma = req.prisma;
  const id = Number(req.params.id);

  try {
    const client = await prisma.client.findUnique({
      where: { id },
      include: { employees: true },
    });

    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }

    res.json(client);
  } catch (err) {
    console.error("getClientById error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
}

async function createClient(req, res) {
  const prisma = req.prisma;
  try {
    const { name, industry } = req.body;

    const client = await prisma.client.create({
      data: { name, industry },
    });

    res.status(201).json(client);
  } catch (err) {
    console.error("createClient error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
}

async function updateClient(req, res) {
  const prisma = req.prisma;
  const id = Number(req.params.id);

  try {
    const { name, industry } = req.body;

    const client = await prisma.client.update({
      where: { id },
      data: { name, industry },
    });

    res.json(client);
  } catch (err) {
    console.error("updateClient error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
}

async function deleteClient(req, res) {
  const prisma = req.prisma;
  const id = Number(req.params.id);

  try {
    await prisma.client.delete({ where: { id } });
    res.status(204).send();
  } catch (err) {
    console.error("deleteClient error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
}

module.exports = {
  getClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient,
};
