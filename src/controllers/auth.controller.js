const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

async function register(req, res) {
  const prisma = req.prisma;

  try {
    const { email, password, role } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }
    // ✅ CHECK IF USER IS ACTIVE
    if (!user.active) {
      return res.status(403).json({
        message:
          "Your account has been deactivated. Please contact the administrator.",
      });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ message: "User already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: role || "hr",
      },
    });

    res.status(201).json({
      id: user.id,
      email: user.email,
      role: user.role,
    });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
}

async function login(req, res) {
  const prisma = req.prisma;

  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }
    // ✅ CHECK IF USER IS ACTIVE
    if (!user.active) {
      return res.status(403).json({
        message:
          "Your account has been deactivated. Please contact the administrator.",
      });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        // first_name: user.first_name,
        // last_name: user.last_name,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        // first_name: user.first_name,
        // last_name: user.last_name,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
}

module.exports = { register, login };
