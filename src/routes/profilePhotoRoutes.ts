import express from "express";
import multer from "multer";
import { authenticateToken } from "../middleware/auth";
import {
  uploadUserProfilePhoto,
  getUserProfilePhoto,
  deleteUserProfilePhoto,
  getPublicProfilePhoto,
} from "../controllers/profilePhotoController";

const router = express.Router();

// Configure multer for in-memory storage (we'll upload directly to Cloudinary)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Check if file is an image
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

// Routes for authenticated users (profile photo management)

/**
 * @route   POST /api/profile-photo/upload
 * @desc    Upload or update user profile photo
 * @access  Private (requires authentication)
 * @body    profilePhoto (file): Image file to upload (max 5MB)
 */
router.post(
  "/upload",
  authenticateToken,
  upload.single("profilePhoto"),
  uploadUserProfilePhoto
);

/**
 * @route   GET /api/profile-photo
 * @desc    Get current user's profile photo
 * @access  Private (requires authentication)
 */
router.get("/", authenticateToken, getUserProfilePhoto);

/**
 * @route   DELETE /api/profile-photo
 * @desc    Delete current user's profile photo
 * @access  Private (requires authentication)
 */
router.delete("/", authenticateToken, deleteUserProfilePhoto);

// Public routes

/**
 * @route   GET /api/profile-photo/public/:userId
 * @desc    Get any user's profile photo (public)
 * @access  Public
 * @params  userId: User ID to get profile photo for
 */
router.get("/public/:userId", getPublicProfilePhoto);

export default router;
