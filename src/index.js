require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { PrismaClient } = require("@prisma/client");

const authRoutes = require("./routes/auth.routes");
const employeeRoutes = require("./routes/employees.routes");
const teamRoutes = require("./routes/teams.routes");
const clientRoutes = require("./routes/clients.routes");
const userRoutes = require("./routes/users.routes");
const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(express.json());

// CORS for local development
const allowedOrigins = [
  "http://localhost:5173", // Vite
  "http://localhost:3000", // CRA
  "https://employee-management-aritha.netlify.app", // add this
  "http://65.0.120.139",
];

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

// Attach prisma to every request object
app.use((req, _res, next) => {
  req.prisma = prisma;
  next();
});

// Health Check
app.get("/", (_req, res) => {
  res.json({ status: "ok", message: "HR Portal Backend Running" });
});

// Feature routes
app.use("/auth", authRoutes);
app.use("/employees", employeeRoutes);
app.use("/teams", teamRoutes);
app.use("/clients", clientRoutes);
app.use("/users", userRoutes);

// Start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
