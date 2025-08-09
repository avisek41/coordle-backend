import express from "express";
import { changePassword } from "../controllers";
import { authenticateToken } from "../middleware/auth";

const router = express.Router();

// Change password route - requires authentication
router.patch("/", authenticateToken, changePassword);

export default router;
