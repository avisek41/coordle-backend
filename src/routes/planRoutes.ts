import { Router } from "express";
import {
  createPlan,
  getAllPlans,
  getPlanById,
} from "../controllers/planController";

const router = Router();

// Public routes (no authentication required)
router.get("/", getAllPlans);
router.get("/:id", getPlanById);

// Create plan route (no authentication required for now)
router.post("/", createPlan);

export default router;
