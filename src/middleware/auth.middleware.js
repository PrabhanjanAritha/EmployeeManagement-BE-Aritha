const jwt = require("jsonwebtoken");

function requireAuth(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const token = header.split(" ")[1];

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // { userId, email, role }
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
}

// NEW: Middleware to require admin role
function requireAdmin(req, res, next) {
  // Check if user is admin@arithaconsulting.com
  if (req.user && req.user.email === "admin@arithaconsulting.com") {
    return next();
  }

  return res.status(403).json({
    message: "Access denied. Admin privileges required.",
  });
}
module.exports = { requireAuth, requireAdmin };
