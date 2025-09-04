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
  addUserToTrip,
  addMultipleUsersToTrip,
  removeUserFromTrip,
  getTripParticipants,
  checkUserInTrip,
  getTripMembers,
  addHostToTrip,
  removeHostFromTrip,
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
router.post("/", authenticateToken, upload.single("coverImage"), createTrip);
router.get("/", authenticateToken, getAllTrips);
router.get("/:id", getTripById);
router.put("/:id", authenticateToken, upload.single("coverImage"), updateTrip);
router.delete("/:id", authenticateToken, deleteTrip);

// Trip cover image upload (for updating existing trips)
router.post(
  "/:id/cover-image",
  authenticateToken,
  upload.single("coverImage"),
  uploadTripCoverImageController
);

// User-specific trip routes
router.get("/user/:userId", getTripsByUser);

// Trip participant management routes
router.post("/:tripId/participants", authenticateToken, addUserToTrip);
router.post(
  "/:tripId/participants/bulk",
  authenticateToken,
  addMultipleUsersToTrip
);
router.delete("/:tripId/participants", authenticateToken, removeUserFromTrip);
router.get("/:tripId/participants", authenticateToken, getTripParticipants);
router.get("/:tripId/check-user", authenticateToken, checkUserInTrip);

// Trip members page route
router.get("/:tripId/members", authenticateToken, getTripMembers);

// Trip host management routes (only trip owner can access)
router.post("/:tripId/hosts", authenticateToken, addHostToTrip);
router.delete("/:tripId/hosts", authenticateToken, removeHostFromTrip);

export default router;
