import express, { Application, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import connectDB from "./config/db";
import userRoutes from "./routes/userRoutes";
import verificationRoutes from "./routes/verificationRoutes";
import profileOptionsRoutes from "./routes/profileOptionsRoutes";
import profilePhotoRoutes from "./routes/profilePhotoRoutes";
import documentRoutes from "./routes/documentRoutes";
import changePasswordRoutes from "./routes/changePasswordRoutes";
import bannerRoutes from "./routes/bannerRoutes";
import planRoutes from "./routes/planRoutes";
import paymentRoutes from "./routes/paymentRoutes";
import tripRoutes from "./routes/tripRoutes";
import tripDocumentRoutes from "./routes/tripDocumentRoutes";
import announcementRoutes from "./routes/announcementRoutes";
import { handleStripeWebhook } from "./controllers/webhookController";
import pollRoutes from "./routes/pollRoutes";

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

// Webhook route at root level for Stripe CLI (BEFORE body parsing)
app.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  handleStripeWebhook
);

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
app.use("/api/verification", verificationRoutes);
app.use("/api/profile-options", profileOptionsRoutes);
app.use("/api/profile-photo", profilePhotoRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/change-password", changePasswordRoutes);
app.use("/api/banners", bannerRoutes);
app.use("/api/plans", planRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/trips", tripRoutes);
app.use("/api/trips", tripDocumentRoutes);
app.use("/api/polls", pollRoutes);
app.use("/api", announcementRoutes);

// Root endpoint
app.get("/", (req: Request, res: Response) => {
  res.status(200).json({
    message: "Welcome to Coordle Backend API with MongoDB",
    version: "1.0.0",
    endpoints: {
      health: "/health",
      users: "/api/users",
      verification: "/api/verification",
      profileOptions: "/api/profile-options",
      profilePhoto: "/api/profile-photo",
      documents: "/api/documents",
      changePassword: "/api/change-password",
      banners: "/api/banners",
      plans: "/api/plans",
      payments: "/api/payments",
      trips: "/api/trips",
      polls: "/api/polls",
      tripDocuments: "/api/trips/:tripId/documents",
      announcements: "/api/trips/:tripId/announcements",
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
