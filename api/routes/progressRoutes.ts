import { Router } from "express";
import {
  completeModule,
  getUserDashboard,
  getUserProgress,
  getUserTimeline,
} from "../controllers/progressController";

const router = Router();

// Route to mark a module as complete
router.post("/modules/complete", completeModule);

// Route to get user progress
router.get("/users/:userId/progress", getUserProgress);

// Route to get user dashboard
router.get("/users/:userId/dashboard", getUserDashboard);

// Route to get user timeline summary
router.get("/users/:userId/timeline", getUserTimeline);

export default router;
