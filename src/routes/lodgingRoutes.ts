import { Router } from "express";
import {
  createLodging,
  deleteLodging,
  getLodgingById,
  getLodgingsByTrip,
  updateLodging,
} from "../controllers/lodgingController";
import { authenticateToken } from "../middleware/auth";

const router = Router();

router.get("/trip/:tripId", authenticateToken, getLodgingsByTrip);
router.post("/", authenticateToken, createLodging);
router.get("/:id", authenticateToken, getLodgingById);
router.put("/:id", authenticateToken, updateLodging);
router.delete("/:id", authenticateToken, deleteLodging);

export default router;

