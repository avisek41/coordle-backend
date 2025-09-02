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
  getCurrentUserPlan,
  requestPasswordReset,
  resetPassword,
  setupProfile,
  checkEmailVerificationStatus,
  checkUserByPhone,
  createPassword,
  checkUserByEmail,
  checkUsersByEmails,
  registerMultipleUsers,
  inviteUsersToTrip,
} from "../controllers/userController";
import { authenticateToken } from "../middleware/auth";

const router = Router();

// Authentication routes
router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/send-login-code", sendLoginVerificationCode);
router.post("/check-email-status", checkEmailVerificationStatus);
router.post("/check-user-by-phone", checkUserByPhone);

// Password reset routes
router.post("/forgot-password", requestPasswordReset);
router.post("/reset-password", resetPassword);
router.post("/create-password", createPassword);

// User profile routes
router.get("/profile", getUserProfile);
router.get("/me", authenticateToken, getCurrentUserProfile);
router.get("/plan", authenticateToken, getCurrentUserPlan);
router.put("/setup-profile", authenticateToken, setupProfile);

// User management routes
router.get("/", getAllUsers);
router.get("/:id", getUserById);
router.put("/:id", updateUser);
router.delete("/:id", deleteUser);

// Role-based routes
router.get("/role/:role", getUsersByRole);

// User utility routes
router.post("/check-email", checkUserByEmail);
router.post("/check-emails", checkUsersByEmails);
router.post("/register-multiple", registerMultipleUsers);
router.post("/invite-to-trip", authenticateToken, inviteUsersToTrip);
router.post("/check-phone", checkUserByPhone);
router.post("/check-email-verification", checkEmailVerificationStatus);

export default router;
