import { Router } from "express";
import {
  generateQuizForModuleController,
  getQuizByModule,
  getUserPerformance,
  submitQuiz,
} from "../controllers/quizController";

const router = Router();

// Route to trigger quiz generation for a module
router.post("/modules/:moduleId/quiz", generateQuizForModuleController);
router.get("/modules/:moduleId/quiz", getQuizByModule);

// Route to submit answers to a quiz
router.post("/quizzes/:quizId/submit", submitQuiz);

// Route to get user performance on quizzes
router.get("/users/:userId/performance", getUserPerformance);

export default router;
