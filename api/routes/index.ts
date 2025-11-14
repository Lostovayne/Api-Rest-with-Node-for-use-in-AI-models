import { Router } from "express";
import agentRoutes from "./agentRoutes";
import dayPlanRoutes from "./dayPlanRoutes";
import progressRoutes from "./progressRoutes";
import quizRoutes from "./quizRoutes";
import searchRoutes from "./searchRoutes";
import studyPathRoutes from "./studyPathRoutes";
import ttsRoutes from "./ttsRoutes";
import userRoutes from "./userRoutes";

const router = Router();

router.use("/", studyPathRoutes);
router.use("/", agentRoutes);
router.use("/", ttsRoutes);
router.use("/", progressRoutes);
router.use("/", quizRoutes);
router.use("/", searchRoutes);
router.use("/", userRoutes);
router.use("/", dayPlanRoutes);

export default router;
