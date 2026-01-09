import { Router } from "express";
import {
  createActivity,
  deleteActivity,
  getActivityById,
  getActivitiesByTrip,
  updateActivity,
} from "../controllers/activityController";
import { authenticateToken } from "../middleware/auth";

const router = Router();

router.get("/trip/:tripId", authenticateToken, getActivitiesByTrip);
router.post("/", authenticateToken, createActivity);
router.get("/:id", authenticateToken, getActivityById);
router.put("/:id", authenticateToken, updateActivity);
router.delete("/:id", authenticateToken, deleteActivity);

export default router;

