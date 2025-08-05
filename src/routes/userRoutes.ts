import { Router } from "express";
import {
  registerUser,
  loginUser,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  getUsersByRole,
  getUserProfile,
} from "../controllers/userController";

const router = Router();

// Authentication routes
router.post("/register", registerUser);
router.post("/login", loginUser);

// User profile route
router.get("/profile", getUserProfile);

// User management routes
router.get("/", getAllUsers);
router.get("/:id", getUserById);
router.put("/:id", updateUser);
router.delete("/:id", deleteUser);

// Role-based routes
router.get("/role/:role", getUsersByRole);

export default router;
