import { Router } from "express";
import {
  addMoodSnapshot,
  getMoodSummaryHandler,
  listMoodHistory,
} from "../controllers/moodController";

const router = Router();

router.post("/users/:userId/mood", addMoodSnapshot);
router.get("/users/:userId/mood", listMoodHistory);
router.get("/users/:userId/mood/summary", getMoodSummaryHandler);

export default router;
