import { Router } from "express";
import {
  registerUser,
  loginUser,
  sendLoginVerificationCode,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  getUsersByRole,
  getUserProfile,
  getCurrentUserProfile,
  requestPasswordReset,
  resetPassword,
  setupProfile,
  checkEmailVerificationStatus,
} from "../controllers/userController";
import { authenticateToken } from "../middleware/auth";

const router = Router();

// Authentication routes
router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/send-login-code", sendLoginVerificationCode);
router.post("/check-email-status", checkEmailVerificationStatus);

// Password reset routes
router.post("/forgot-password", requestPasswordReset);
router.post("/reset-password", resetPassword);

// User profile routes
router.get("/profile", getUserProfile);
router.get("/me", authenticateToken, getCurrentUserProfile);
router.put("/setup-profile", authenticateToken, setupProfile);

// User management routes
router.get("/", getAllUsers);
router.get("/:id", getUserById);
router.put("/:id", updateUser);
router.delete("/:id", deleteUser);

// Role-based routes
router.get("/role/:role", getUsersByRole);

export default router;
