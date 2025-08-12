import { Router } from "express";
import multer from "multer";
import {
  createTrip,
  uploadTripCoverImageController,
  getAllTrips,
  getTripById,
  updateTrip,
  deleteTrip,
  getTripsByUser,
} from "../controllers/tripController";
import { authenticateToken } from "../middleware/auth";

const router = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only image files
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

// Trip CRUD routes
router.post("/", authenticateToken, createTrip);
router.get("/", getAllTrips);
router.get("/:id", getTripById);
router.put("/:id", authenticateToken, updateTrip);
router.delete("/:id", authenticateToken, deleteTrip);

// Trip cover image upload
router.post(
  "/:id/cover-image",
  authenticateToken,
  upload.single("coverImage"),
  uploadTripCoverImageController
);

// User-specific trip routes
router.get("/user/:userId", getTripsByUser);

export default router; 