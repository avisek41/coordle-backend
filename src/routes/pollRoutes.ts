import { Router } from "express";
import {
  createPoll,
  getPollsByTrip,
  getPollById,
  updatePoll,
  deletePoll,
  publishPoll,
  closePoll,
  getAllPolls,
  voteOnPoll,
  getPollVotes,
} from "../controllers/pollController";
import { authenticateToken } from "../middleware/auth";

const router = Router();
console.log("pollRoutes");
// Poll CRUD routes
router.post("/", authenticateToken, createPoll);
router.get("/", authenticateToken, getAllPolls);
router.get("/:id", authenticateToken, getPollById);
router.put("/:id", authenticateToken, updatePoll);
router.delete("/:id", authenticateToken, deletePoll);

// Poll action routes
router.post("/:id/publish", authenticateToken, publishPoll);
router.post("/:id/close", authenticateToken, closePoll);

// Voting routes
router.post("/:id/vote", authenticateToken, voteOnPoll);
router.get("/:id/votes", authenticateToken, getPollVotes);

// Trip-specific poll routes
router.get("/trip/:tripId", authenticateToken, getPollsByTrip);

export default router;