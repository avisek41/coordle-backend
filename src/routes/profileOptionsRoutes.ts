import express from "express";
import {
  getProfileOptions,
  createProfileOptions,
  updateProfileOptions,
  deleteProfileOptions,
} from "../controllers/profileOptionsController";

const router = express.Router();

// GET /api/profile-options - Get all profile options or filter by category
router.get("/", getProfileOptions);

// POST /api/profile-options - Create new profile options
router.post("/", createProfileOptions);

// PUT /api/profile-options/:category - Update profile options for a specific category
router.put("/:category", updateProfileOptions);

// DELETE /api/profile-options/:category - Delete profile options for a specific category
router.delete("/:category", deleteProfileOptions);

export default router;
