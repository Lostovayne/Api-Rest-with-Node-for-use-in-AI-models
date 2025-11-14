import { Router } from "express";
import {
  createOrUpdateDayPlan,
  getDayPlanHandler,
} from "../controllers/dayPlanController";

const router = Router();

router.post("/users/:userId/day-plan", createOrUpdateDayPlan);
router.get("/users/:userId/day-plan", getDayPlanHandler);

export default router;
