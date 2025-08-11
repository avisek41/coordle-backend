import { Router } from "express";
import {
  createPlan,
  getAllPlans,
  getPlanById,
  getAllPlanPrices,
} from "../controllers/planController";

const router = Router();

// Public routes (no authentication required)
router.get("/", getAllPlans);
router.get("/prices", getAllPlanPrices);
router.get("/:id", getPlanById);

// Create plan route (no authentication required for now)
router.post("/", createPlan);

export default router;
