import { Router } from "express";
import {
  createMeal,
  updateMeal,
  deleteMeal,
  getMealsByTrip,
  getMealById,
  submitMealOrder,
  updateMealOrder,
} from "../controllers/mealController";
import { authenticateToken } from "../middleware/auth";

const router = Router();

// Trip-specific meal routes (must come before /:id routes)
router.get("/trip/:tripId", authenticateToken, getMealsByTrip);

// Meal order routes (must come before /:id routes to avoid route conflicts)
router.post("/:mealId/order", authenticateToken, submitMealOrder);
router.put("/:mealId/order/:orderId", authenticateToken, updateMealOrder);

// Meal CRUD routes
router.post("/", authenticateToken, createMeal);
router.get("/:id", authenticateToken, getMealById);
router.put("/:id", authenticateToken, updateMeal);
router.delete("/:id", authenticateToken, deleteMeal);

export default router;

