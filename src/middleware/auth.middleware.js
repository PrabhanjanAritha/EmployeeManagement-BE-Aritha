const jwt = require("jsonwebtoken");

async function requireAuth(req, res, next) {
  const prisma = req.prisma;

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ✅ VERIFY USER IS STILL ACTIVE IN DATABASE
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, role: true, active: true },
    });

    // Check if user exists
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    // ✅ CHECK IF USER IS ACTIVE
    if (!user.active) {
      return res.status(403).json({
        message:
          "Your account has been deactivated. Please contact the administrator.",
      });
    }

    // Attach user info to request
    req.user = {
      userId: user.id,
      email: user.email,
      role: user.role,
      active: user.active,
    };

    next();
  } catch (err) {
    if (err.name === "JsonWebTokenError") {
      return res.status(401).json({ message: "Invalid token" });
    }
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token expired" });
    }
    return res.status(401).json({ message: "Authentication failed" });
  }
}

// Middleware to require admin role
function requireAdmin(req, res, next) {
  // Check if user is admin@arithaconsulting.com
  if (req.user && req.user.email === "admin@arithaconsulting.com") {
    return next();
  }

  return res.status(403).json({
    message: "Access denied. TN-Admin privileges required.",
  });
}
// Middleware to require admin role
function requireAdminEdit(req, res, next) {
  // Check if user is admin@arithaconsulting.com
  if (req.user && req.user.role === "admin") {
    return next();
  }

  return res.status(403).json({
    message: "Access denied. Admin privileges required.",
  });
}
module.exports = { requireAuth, requireAdmin, requireAdminEdit };
