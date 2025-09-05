import { Router } from "express";
import {
  createAnnouncement,
  getAnnouncements,
  updateAnnouncement,
  deleteAnnouncement,
} from "../controllers/announcementController";
import { authenticateToken } from "../middleware/auth";

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Trip-specific announcement routes
router.post("/trips/:tripId/announcements", createAnnouncement);
router.get("/trips/:tripId/announcements", getAnnouncements);

// General announcement routes
router.put("/announcements/:id", updateAnnouncement);
router.delete("/announcements/:id", deleteAnnouncement);

export default router;
