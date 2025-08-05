import express, { Application, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import connectDB from "./config/db";
import userRoutes from "./routes/userRoutes";

// Load environment variables
dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
console.log("🚀 Starting Coordle backend server...");
connectDB();

// Middleware
app.use(helmet()); // Security headers
app.use(cors()); // Enable CORS
app.use(morgan("combined")); // Logging
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Health check endpoint
app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({
    status: "OK",
    message: "Coordle backend is running with MongoDB",
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use("/api/users", userRoutes);

// Root endpoint
app.get("/", (req: Request, res: Response) => {
  res.status(200).json({
    message: "Welcome to Coordle Backend API with MongoDB",
    version: "1.0.0",
    endpoints: {
      health: "/health",
      users: "/api/users",
    },
  });
});

// Catch-all 404 handler
app.use("*", (req: Request, res: Response) => {
  res.status(404).json({
    error: "Route not found",
    path: req.originalUrl,
  });
});

// Start the server with MongoDB
app.listen(PORT, () => {
  console.log(`🚀 Coordle backend server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🗄️  MongoDB connected successfully`);
});
